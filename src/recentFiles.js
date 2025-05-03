const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

class RecentFilesService {
    constructor() {
        this.supportedExtensions = [
            '.txt', '.doc', '.docx', '.pdf', '.md',
            '.js', '.py', '.java', '.cpp', '.h',
            '.json', '.xml', '.yaml', '.yml',
            '.csv', '.xls', '.xlsx',
            // Image extensions
            '.jpg', '.jpeg', '.png', '.gif',
            '.webp', '.tiff', '.bmp'
        ];

        // Common directories to monitor
        this.watchedDirectories = [
            path.join(os.homedir(), 'Documents'),
            path.join(os.homedir(), 'Downloads'),
            path.join(os.homedir(), 'Desktop'),
            // Add more directories as needed
        ];
    }

    async searchDirectory(directory) {
        try {
            // For Downloads directory on macOS, try using mdfind first
            if (directory.endsWith('Downloads') && process.platform === 'darwin') {
                try {
                    const { stdout } = await execPromise(`mdfind "kMDItemFSContentChangeDate >= $time.today(-30)" -onlyin "${directory}"`);
                    const files = stdout.split('\n').filter(Boolean);
                    const results = [];

                    for (const filePath of files) {
                        try {
                            const stats = await fs.stat(filePath);
                            if (stats.isFile()) {
                                const ext = path.extname(filePath).toLowerCase();
                                if (this.supportedExtensions.includes(ext)) {
                                    results.push({
                                        path: filePath,
                                        name: path.basename(filePath),
                                        extension: ext,
                                        size: stats.size,
                                        lastModified: stats.mtime,
                                        lastAccessed: stats.atime,
                                        directory: path.basename(directory)
                                    });
                                }
                            }
                        } catch (error) {
                            continue;
                        }
                    }
                    return results;
                } catch (error) {
                    console.warn(`mdfind failed for Downloads directory: ${error.message}`);
                    // Fall back to regular directory scan
                }
            }

            // Regular directory scan for other directories
            const files = await fs.readdir(directory);
            const results = [];

            for (const file of files) {
                const fullPath = path.join(directory, file);
                try {
                    const stats = await fs.stat(fullPath);
                    if (stats.isFile()) {
                        const ext = path.extname(file).toLowerCase();
                        if (this.supportedExtensions.includes(ext)) {
                            results.push({
                                path: fullPath,
                                name: file,
                                extension: ext,
                                size: stats.size,
                                lastModified: stats.mtime,
                                lastAccessed: stats.atime,
                                directory: path.basename(directory)
                            });
                        }
                    }
                } catch (error) {
                    // Skip files we can't access
                    continue;
                }
            }

            return results;
        } catch (error) {
            if (error.code === 'EPERM' || error.code === 'EACCES') {
                // Try alternative method for Downloads directory
                if (directory.endsWith('Downloads') && process.platform === 'darwin') {
                    try {
                        // Use find command as a last resort
                        const { stdout } = await execPromise(`find "${directory}" -type f -mtime -30 2>/dev/null`);
                        const files = stdout.split('\n').filter(Boolean);
                        const results = [];

                        for (const filePath of files) {
                            try {
                                const stats = await fs.stat(filePath);
                                const ext = path.extname(filePath).toLowerCase();
                                if (this.supportedExtensions.includes(ext)) {
                                    results.push({
                                        path: filePath,
                                        name: path.basename(filePath),
                                        extension: ext,
                                        size: stats.size,
                                        lastModified: stats.mtime,
                                        lastAccessed: stats.atime,
                                        directory: path.basename(directory)
                                    });
                                }
                            } catch (error) {
                                continue;
                            }
                        }
                        return results;
                    } catch (error) {
                        console.warn(`Alternative method failed for Downloads directory: ${error.message}`);
                        return [];
                    }
                }
                console.warn(`Permission denied for directory ${directory}. Skipping...`);
                return [];
            }
            console.error(`Error reading directory ${directory}:`, error);
            return [];
        }
    }

    async getMacRecentFiles() {
        try {
            const recentFiles = new Map();

            // First try to get files from watched directories
            for (const dir of this.watchedDirectories) {
                const dirFiles = await this.searchDirectory(dir);
                for (const file of dirFiles) {
                    recentFiles.set(file.path, file);
                }
            }

            // Then try to get additional recent files using mdfind
            try {
                const queries = [
                    // Recently modified files (last 30 days)
                    'mdfind "kMDItemFSContentChangeDate >= $time.today(-30)"',
                    // Recently created files (last 30 days)
                    'mdfind "kMDItemFSCreationDate >= $time.today(-30)"',
                    // Recently opened files (last 30 days)
                    'mdfind "kMDItemLastUsedDate >= $time.today(-30)"'
                ];

                // Execute all mdfind queries
                for (const query of queries) {
                    const { stdout } = await execPromise(query);
                    const files = stdout.split('\n').filter(Boolean);

                    for (const file of files) {
                        const ext = path.extname(file).toLowerCase();
                        if (this.supportedExtensions.includes(ext)) {
                            try {
                                const stats = await fs.stat(file);
                                if (stats.isFile()) {
                                    recentFiles.set(file, {
                                        path: file,
                                        name: path.basename(file),
                                        extension: ext,
                                        size: stats.size,
                                        lastModified: stats.mtime,
                                        lastAccessed: stats.atime,
                                        directory: path.basename(path.dirname(file))
                                    });
                                }
                            } catch (error) {
                                // Skip files we can't access
                                continue;
                            }
                        }
                    }
                }
            } catch (error) {
                console.warn('Error executing mdfind queries:', error);
                // Continue with files from watched directories only
            }

            // Convert Map to array and sort by last accessed time
            const sortedFiles = Array.from(recentFiles.values())
                .sort((a, b) => b.lastAccessed - a.lastAccessed);

            // Group files by directory
            const groupedFiles = sortedFiles.reduce((groups, file) => {
                const dir = file.directory;
                if (!groups[dir]) {
                    groups[dir] = [];
                }
                groups[dir].push(file);
                return groups;
            }, {});

            return {
                files: sortedFiles,
                groupedByDirectory: groupedFiles
            };
        } catch (error) {
            console.error('Error getting recent files:', error);
            return { files: [], groupedByDirectory: {} };
        }
    }

    async getRecentFiles() {
        // Currently only supporting macOS
        if (process.platform === 'darwin') {
            return this.getMacRecentFiles();
        }

        // For other platforms, return empty results
        return { files: [], groupedByDirectory: {} };
    }

    // Add a directory to watch
    async addWatchDirectory(directory) {
        if (!this.watchedDirectories.includes(directory)) {
            this.watchedDirectories.push(directory);
        }
    }

    // Remove a directory from watch list
    async removeWatchDirectory(directory) {
        const index = this.watchedDirectories.indexOf(directory);
        if (index !== -1) {
            this.watchedDirectories.splice(index, 1);
        }
    }

    // Get list of watched directories
    getWatchedDirectories() {
        return this.watchedDirectories;
    }
}

module.exports = RecentFilesService; 
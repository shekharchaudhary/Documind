const express = require('express');
const multer = require('multer');
const path = require('path');
const mime = require('mime-types');
const FileAnalyzer = require('./fileAnalyzer');
const RecentFilesService = require('./recentFiles');
const fs = require('fs');
const session = require('express-session');
const gmailRoutes = require('./routes/gmail');

const app = express();
const port = 3002;

// Store the last analyzed file path for follow-up questions
let lastAnalyzedFile = null;

// Initialize services
const analyzer = new FileAnalyzer();
const recentFilesService = new RecentFilesService();

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../uploads/'));
    },
    filename: function (req, file, cb) {
        // Preserve original file extension
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`);
    }
});

const fileFilter = (req, file, cb) => {
    // Get the mime type and extension
    const mimeType = mime.lookup(file.originalname);
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = path.basename(file.originalname).toLowerCase();

    console.log('Attempting to upload file:', {
        originalname: file.originalname,
        mimeType: mimeType,
        extension: extension,
        filename: filename
    });

    // Use the FileAnalyzer's type detection
    const fileType = analyzer.detectFileType(file.originalname);

    if (fileType.isSupported) {
        // Log additional information about the accepted file
        console.log('File accepted:', {
            category: fileType.category,
            isText: fileType.isText,
            isDocument: fileType.isDocument,
            isArchive: fileType.isArchive,
            isCode: fileType.isCode,
            isConfig: fileType.isConfig,
            isData: fileType.isData
        });
        return cb(null, true);
    }

    // Provide detailed error message for unsupported files
    const error = new Error(
        `Unsupported file type: ${mimeType} (${extension})\n` +
        `File category: ${fileType.category}\n` +
        'Please check the documentation for supported file types.'
    );
    error.code = 'UNSUPPORTED_FILE_TYPE';
    cb(error);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // Increased to 50MB limit
    }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));
app.use(express.json());

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Add session middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Add Gmail routes
app.use('/', gmailRoutes);

// Add endpoint to get supported file types
app.get('/supported-file-types', (req, res) => {
    const fileTypes = {
        text: Object.keys(analyzer.supportedTypes).filter(type => type.startsWith('text/')),
        application: Object.keys(analyzer.supportedTypes).filter(type => type.startsWith('application/')),
        model: Object.keys(analyzer.supportedTypes).filter(type => type.startsWith('model/')),
        message: Object.keys(analyzer.supportedTypes).filter(type => type.startsWith('message/')),
        additionalExtensions: analyzer.additionalExtensions
    };

    res.json({
        success: true,
        supportedTypes: fileTypes,
        maxFileSize: '50MB'
    });
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                error: 'File too large',
                maxSize: '50MB',
                details: 'The uploaded file exceeds the maximum allowed size.'
            });
        }
        return res.status(400).json({
            error: 'File upload error',
            code: err.code,
            details: err.message
        });
    }

    if (err.code === 'UNSUPPORTED_FILE_TYPE') {
        return res.status(415).json({
            error: 'Unsupported file type',
            details: err.message,
            supportedTypesEndpoint: '/supported-file-types'
        });
    }

    // Default error response
    res.status(500).json({
        error: 'Internal server error',
        message: err.message || 'Something went wrong!',
        code: err.code
    });
});

app.post('/analyze', upload.single('file'), async (req, res) => {
    try {
        const file = req.file;
        const query = req.body.query || 'Please summarize this file';

        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        console.log('Received file:', {
            originalName: file.originalname,
            filename: file.filename,
            mimetype: file.mimetype,
            size: file.size
        });

        lastAnalyzedFile = file.path; // Store the file path
        const result = await analyzer.analyzeFile(file.path, query);
        res.json(result);
    } catch (error) {
        console.error('Error processing file:', error);
        res.status(500).json({ error: error.message });
    }
});

// New endpoint for follow-up questions
app.post('/ask', async (req, res) => {
    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'No question provided' });
        }

        if (!lastAnalyzedFile) {
            return res.status(400).json({ error: 'No file has been analyzed yet' });
        }

        console.log('Follow-up question:', {
            query,
            file: lastAnalyzedFile
        });

        const result = await analyzer.analyzeFile(lastAnalyzedFile, query);
        res.json(result);
    } catch (error) {
        console.error('Error processing follow-up question:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add a test endpoint
app.get('/test', (req, res) => {
    res.json({ message: 'Server is running correctly' });
});

// Root endpoint to serve the interface
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Add endpoint to get recent files
app.get('/recent-files', async (req, res) => {
    try {
        const result = await recentFilesService.getRecentFiles();

        // Add directory access status to the response
        const directoryStatus = {};
        for (const dir of recentFilesService.watchedDirectories) {
            try {
                await fs.access(dir, fs.constants.R_OK);
                directoryStatus[dir] = true;
            } catch (error) {
                directoryStatus[dir] = false;
            }
        }

        res.json({
            success: true,
            files: result.files,
            groupedByDirectory: result.groupedByDirectory,
            directoryStatus
        });
    } catch (error) {
        console.error('Error getting recent files:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Add endpoint to analyze existing file
app.post('/analyze-existing', async (req, res) => {
    try {
        const { filePath, query } = req.body;

        if (!filePath) {
            return res.status(400).json({ error: 'No file path provided' });
        }

        console.log('Analyzing existing file:', {
            path: filePath,
            query: query || 'Please summarize this file'
        });

        lastAnalyzedFile = filePath;
        const result = await analyzer.analyzeFile(filePath, query);
        res.json(result);
    } catch (error) {
        console.error('Error processing existing file:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add new endpoints for directory management
app.get('/watched-directories', (req, res) => {
    const directories = recentFilesService.getWatchedDirectories();
    res.json({ success: true, directories });
});

app.post('/watch-directory', async (req, res) => {
    try {
        const { directory } = req.body;
        if (!directory) {
            return res.status(400).json({ success: false, error: 'No directory provided' });
        }

        await recentFilesService.addWatchDirectory(directory);
        res.json({ success: true, message: 'Directory added successfully' });
    } catch (error) {
        console.error('Error adding directory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.post('/unwatch-directory', async (req, res) => {
    try {
        const { directory } = req.body;
        if (!directory) {
            return res.status(400).json({ success: false, error: 'No directory provided' });
        }

        await recentFilesService.removeWatchDirectory(directory);
        res.json({ success: true, message: 'Directory removed successfully' });
    } catch (error) {
        console.error('Error removing directory:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

const server = app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
    console.log(`Test the server by visiting http://localhost:${port}/test`);
}).on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(`Port ${port} is already in use. Please try a different port.`);
        process.exit(1);
    } else {
        console.error('Server error:', err);
    }
}); 
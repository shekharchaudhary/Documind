const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { analyzeFile } = require('../services/ai');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Create uploads directory if it doesn't exist
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// Get all files
router.get('/', (req, res) => {
    const query = req.query.search ?
        `SELECT f.*, GROUP_CONCAT(t.name) as tags 
     FROM files f 
     LEFT JOIN file_tags ft ON f.id = ft.file_id 
     LEFT JOIN tags t ON ft.tag_id = t.id 
     WHERE f.name LIKE ? OR f.metadata LIKE ?
     GROUP BY f.id` :
        `SELECT f.*, GROUP_CONCAT(t.name) as tags 
     FROM files f 
     LEFT JOIN file_tags ft ON f.id = ft.file_id 
     LEFT JOIN tags t ON ft.tag_id = t.id 
     GROUP BY f.id`;

    const params = req.query.search ?
        [`%${req.query.search}%`, `%${req.query.search}%`] : [];

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        // Process tags for each file
        const files = rows.map(file => ({
            ...file,
            tags: file.tags ? file.tags.split(',') : []
        }));
        res.json(files);
    });
});

// Upload a new file
router.post('/', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileInfo = {
            path: req.file.path,
            name: req.file.originalname,
            type: path.extname(req.file.originalname).toLowerCase(),
            size: req.file.size,
            last_modified: new Date()
        };

        // Insert file info into database
        db.run(
            `INSERT INTO files (path, name, type, size, last_modified) 
       VALUES (?, ?, ?, ?, ?)`,
            [fileInfo.path, fileInfo.name, fileInfo.type, fileInfo.size, fileInfo.last_modified],
            async function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }

                const fileId = this.lastID;

                // Analyze file with AI if it's a supported type
                const supportedTypes = ['.pdf', '.txt', '.doc', '.docx', '.jpg', '.jpeg', '.png'];
                if (supportedTypes.includes(fileInfo.type)) {
                    try {
                        const aiTags = await analyzeFile(fileInfo.path);
                        // Save AI-generated tags
                        for (const tag of aiTags) {
                            db.run(
                                `INSERT OR IGNORE INTO tags (name, type) VALUES (?, 'ai')`,
                                [tag],
                                function (err) {
                                    if (!err) {
                                        db.run(
                                            `INSERT INTO file_tags (file_id, tag_id, is_ai_generated) 
                       SELECT ?, id, TRUE FROM tags WHERE name = ?`,
                                            [fileId, tag]
                                        );
                                    }
                                }
                            );
                        }
                    } catch (error) {
                        console.error('AI analysis error:', error);
                    }
                }

                res.json({
                    id: fileId,
                    ...fileInfo,
                    tags: []
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get file by id with its tags
router.get('/:id', (req, res) => {
    db.get(
        `SELECT f.*, GROUP_CONCAT(t.name) as tags
     FROM files f
     LEFT JOIN file_tags ft ON f.id = ft.file_id
     LEFT JOIN tags t ON ft.tag_id = t.id
     WHERE f.id = ?
     GROUP BY f.id`,
        [req.params.id],
        (err, row) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!row) {
                return res.status(404).json({ error: 'File not found' });
            }
            row.tags = row.tags ? row.tags.split(',') : [];
            res.json(row);
        }
    );
});

// Update file tags
router.put('/:id/tags', (req, res) => {
    const { tags } = req.body;
    const fileId = req.params.id;

    if (!Array.isArray(tags)) {
        return res.status(400).json({ error: 'Tags must be an array' });
    }

    db.run('BEGIN TRANSACTION');

    // Remove existing manual tags
    db.run(
        `DELETE FROM file_tags WHERE file_id = ? AND is_ai_generated = FALSE`,
        [fileId]
    );

    // Add new tags
    tags.forEach(tag => {
        db.run(
            `INSERT OR IGNORE INTO tags (name, type) VALUES (?, 'manual')`,
            [tag],
            function (err) {
                if (!err) {
                    db.run(
                        `INSERT INTO file_tags (file_id, tag_id, is_ai_generated) 
             SELECT ?, id, FALSE FROM tags WHERE name = ?`,
                        [fileId, tag]
                    );
                }
            }
        );
    });

    db.run('COMMIT', err => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Tags updated successfully' });
    });
});

// Delete file
router.delete('/:id', (req, res) => {
    // First get the file path
    db.get('SELECT path FROM files WHERE id = ?', [req.params.id], (err, row) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        if (row) {
            // Delete the physical file
            try {
                fs.unlinkSync(row.path);
            } catch (error) {
                console.error('Error deleting file:', error);
            }
        }
        // Delete from database
        db.run('DELETE FROM files WHERE id = ?', [req.params.id], err => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'File deleted successfully' });
        });
    });
});

module.exports = router; 
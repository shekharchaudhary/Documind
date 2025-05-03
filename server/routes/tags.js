const express = require('express');
const router = express.Router();
const { db } = require('../database');

// Get all tags
router.get('/', (req, res) => {
    db.all('SELECT * FROM tags', (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Get files by tag
router.get('/:id/files', (req, res) => {
    db.all(
        `SELECT f.* 
     FROM files f
     JOIN file_tags ft ON f.id = ft.file_id
     WHERE ft.tag_id = ?`,
        [req.params.id],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Create a new tag
router.post('/', (req, res) => {
    const { name, type = 'manual' } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Tag name is required' });
    }

    db.run(
        'INSERT INTO tags (name, type) VALUES (?, ?)',
        [name, type],
        function (err) {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({
                id: this.lastID,
                name,
                type
            });
        }
    );
});

// Update a tag
router.put('/:id', (req, res) => {
    const { name } = req.body;

    if (!name) {
        return res.status(400).json({ error: 'Tag name is required' });
    }

    db.run(
        'UPDATE tags SET name = ? WHERE id = ?',
        [name, req.params.id],
        err => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json({ message: 'Tag updated successfully' });
        }
    );
});

// Delete a tag
router.delete('/:id', (req, res) => {
    db.run('DELETE FROM tags WHERE id = ?', [req.params.id], err => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ message: 'Tag deleted successfully' });
    });
});

module.exports = router; 
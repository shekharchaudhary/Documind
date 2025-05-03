const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { setupDatabase } = require('./database');
const fileRoutes = require('./routes/files');
const tagRoutes = require('./routes/tags');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database
setupDatabase();

// Routes
app.use('/api/files', fileRoutes);
app.use('/api/tags', tagRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 
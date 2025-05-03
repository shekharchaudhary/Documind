const express = require('express');
const router = express.Router();
const gmailService = require('../services/gmail');
const aiService = require('../services/ai');

// Initialize Google OAuth
router.get('/auth/google', (req, res) => {
    const authUrl = gmailService.getAuthUrl();
    res.redirect(authUrl);
});

// OAuth callback handler
router.get('/auth/google/callback', async (req, res) => {
    try {
        const { code } = req.query;
        const tokens = await gmailService.setCredentials(code);

        // Store tokens in session or secure storage
        req.session.tokens = tokens;

        res.redirect('/emails.html'); // Redirect to the email analysis page
    } catch (error) {
        console.error('OAuth callback error:', error);
        res.status(500).json({
            success: false,
            error: 'Authentication failed: ' + error.message
        });
    }
});

// Analyze emails endpoint
router.post('/analyze-emails', async (req, res) => {
    try {
        const { query, maxResults = 10 } = req.body;

        // Get emails from Gmail
        const emailsResult = await gmailService.analyzeEmails(query, maxResults);

        if (!emailsResult.success) {
            throw new Error(emailsResult.error);
        }

        // Use AI to analyze the emails
        const analysis = await aiService.analyzeEmails(emailsResult.emails);

        res.json({
            success: true,
            emails: emailsResult.emails,
            analysis: analysis
        });
    } catch (error) {
        console.error('Email analysis error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to analyze emails: ' + error.message
        });
    }
});

// Get email attachment
router.get('/attachment/:messageId/:attachmentId', async (req, res) => {
    try {
        const { messageId, attachmentId } = req.params;
        const result = await gmailService.getAttachment(messageId, attachmentId);

        if (!result.success) {
            throw new Error(result.error);
        }

        // Convert base64 to buffer
        const buffer = Buffer.from(result.data, 'base64');

        res.set('Content-Type', 'application/octet-stream');
        res.set('Content-Disposition', 'attachment');
        res.set('Content-Length', result.size);
        res.send(buffer);
    } catch (error) {
        console.error('Attachment fetch error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch attachment: ' + error.message
        });
    }
});

// Email summary endpoint
router.post('/summarize-emails', async (req, res) => {
    try {
        const { emails } = req.body;
        const summary = await gmailService.summarizeEmails(emails);

        res.json({
            success: true,
            ...summary
        });
    } catch (error) {
        console.error('Email summarization error:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to summarize emails: ' + error.message
        });
    }
});

module.exports = router; 
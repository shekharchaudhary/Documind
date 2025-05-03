const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const aiService = require('./ai');

class GmailService {
    constructor() {
        this.oauth2Client = new OAuth2Client(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'http://localhost:3002/auth/google/callback'
        );
    }

    getAuthUrl() {
        return this.oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: [
                'https://www.googleapis.com/auth/gmail.readonly',
                'https://www.googleapis.com/auth/gmail.metadata'
            ]
        });
    }

    async setCredentials(code) {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        return tokens;
    }

    async analyzeEmails(query = '', maxResults = 10) {
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

        try {
            // Fetch emails based on query
            const response = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: maxResults
            });

            if (!response.data.messages) {
                return {
                    success: true,
                    emails: [],
                    summary: 'No emails found matching the criteria.'
                };
            }

            // Fetch detailed information for each email
            const emails = await Promise.all(
                response.data.messages.map(async (message) => {
                    const emailData = await gmail.users.messages.get({
                        userId: 'me',
                        id: message.id,
                        format: 'full'
                    });

                    const headers = emailData.data.payload.headers;
                    const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
                    const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
                    const date = headers.find(h => h.name === 'Date')?.value || '';

                    // Extract email body
                    let body = '';
                    if (emailData.data.payload.parts) {
                        const textPart = emailData.data.payload.parts.find(
                            part => part.mimeType === 'text/plain'
                        );
                        if (textPart && textPart.body.data) {
                            body = Buffer.from(textPart.body.data, 'base64').toString();
                        }
                    } else if (emailData.data.payload.body.data) {
                        body = Buffer.from(emailData.data.payload.body.data, 'base64').toString();
                    }

                    // Get attachments info
                    const attachments = [];
                    if (emailData.data.payload.parts) {
                        emailData.data.payload.parts.forEach(part => {
                            if (part.filename && part.body.attachmentId) {
                                attachments.push({
                                    filename: part.filename,
                                    mimeType: part.mimeType,
                                    attachmentId: part.body.attachmentId
                                });
                            }
                        });
                    }

                    return {
                        id: message.id,
                        subject,
                        from,
                        date,
                        body,
                        attachments,
                        snippet: emailData.data.snippet
                    };
                })
            );

            return {
                success: true,
                emails,
                summary: `Found ${emails.length} emails matching the criteria.`
            };
        } catch (error) {
            console.error('Error analyzing emails:', error);
            return {
                success: false,
                error: 'Failed to analyze emails: ' + error.message
            };
        }
    }

    async getAttachment(messageId, attachmentId) {
        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

        try {
            const response = await gmail.users.messages.attachments.get({
                userId: 'me',
                messageId: messageId,
                id: attachmentId
            });

            return {
                success: true,
                data: response.data.data,
                size: response.data.size
            };
        } catch (error) {
            console.error('Error fetching attachment:', error);
            return {
                success: false,
                error: 'Failed to fetch attachment: ' + error.message
            };
        }
    }

    async summarizeEmails(emails) {
        try {
            const analysis = await aiService.analyzeEmails(emails);

            if (!analysis.success) {
                return {
                    success: false,
                    error: analysis.error
                };
            }

            return {
                success: true,
                summary: analysis.analysis.summary,
                topics: analysis.analysis.topics,
                actionItems: analysis.analysis.actionItems,
                deadlines: analysis.analysis.deadlines,
                sentiment: analysis.analysis.sentiment,
                participants: analysis.analysis.participants,
                priority: analysis.analysis.priority,
                emailCount: emails.length
            };
        } catch (error) {
            console.error('Email summarization error:', error);
            return {
                success: false,
                error: 'Failed to summarize emails: ' + error.message
            };
        }
    }
}

module.exports = new GmailService(); 
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function analyzeFile(filePath) {
    const fileType = path.extname(filePath).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png'].includes(fileType);
    const isDocument = ['.pdf', '.txt', '.doc', '.docx'].includes(fileType);

    if (isImage) {
        return await analyzeImage(filePath);
    } else if (isDocument) {
        return await analyzeDocument(filePath);
    }

    throw new Error('Unsupported file type');
}

async function analyzeImage(filePath) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: "Analyze this image and provide relevant tags. Focus on: scene type, objects, people (if any), colors, mood, and activities. Return only the tags as a comma-separated list."
                        },
                        {
                            type: "image_url",
                            image_url: {
                                url: `data:image/jpeg;base64,${fs.readFileSync(filePath).toString('base64')}`
                            }
                        }
                    ],
                }
            ],
            max_tokens: 100
        });

        const tags = response.choices[0].message.content
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        return tags;
    } catch (error) {
        console.error('Error analyzing image:', error);
        return [];
    }
}

async function analyzeDocument(filePath) {
    try {
        // Read file content
        const content = fs.readFileSync(filePath, 'utf-8');

        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                {
                    role: "user",
                    content: `Analyze this document content and provide relevant tags. Focus on: main topics, key terms, document type, and overall theme. Return only the tags as a comma-separated list.\n\nContent: ${content.substring(0, 2000)}...`
                }
            ],
            max_tokens: 100
        });

        const tags = response.choices[0].message.content
            .split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);

        return tags;
    } catch (error) {
        console.error('Error analyzing document:', error);
        return [];
    }
}

module.exports = {
    analyzeFile
}; 
const OpenAI = require('openai');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

async function analyzeEmails(emails) {
    try {
        // Prepare email content for analysis
        const emailContent = emails.map(email => ({
            subject: email.subject,
            from: email.from,
            date: email.date,
            body: email.body?.substring(0, 1000) // Limit body length to avoid token limits
        }));

        const systemPrompt = `You are an AI assistant analyzing emails. Provide a comprehensive analysis including:
1. SUMMARY: A concise summary of the key points
2. TOPICS: Main topics and themes discussed
3. ACTION ITEMS: Required actions, tasks, or follow-ups
4. DEADLINES: Important dates and deadlines
5. SENTIMENT: Overall tone and urgency level
6. PARTICIPANTS: Key people mentioned and their roles
7. ATTACHMENTS: Notable attachments and their relevance
8. PRIORITY: High/Medium/Low based on content and urgency

Format the response in a structured JSON with these categories.`;

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [
                {
                    role: 'system',
                    content: systemPrompt
                },
                {
                    role: 'user',
                    content: JSON.stringify(emailContent, null, 2)
                }
            ],
            temperature: 0.7,
            max_tokens: 1000,
            response_format: { type: "json_object" }
        });

        const analysis = JSON.parse(response.choices[0].message.content);

        // Extract structured data
        return {
            success: true,
            analysis: {
                summary: analysis.SUMMARY,
                topics: analysis.TOPICS || [],
                actionItems: analysis.ACTION_ITEMS || [],
                deadlines: analysis.DEADLINES || [],
                sentiment: analysis.SENTIMENT,
                participants: analysis.PARTICIPANTS || [],
                attachments: analysis.ATTACHMENTS || [],
                priority: analysis.PRIORITY
            },
            raw: analysis // Include raw analysis for debugging
        };
    } catch (error) {
        console.error('Error analyzing emails:', error);

        // Handle specific OpenAI errors
        if (error.response?.status === 429) {
            return {
                success: false,
                error: 'Rate limit exceeded. Please try again in a few moments.'
            };
        }

        if (error.response?.status === 400) {
            return {
                success: false,
                error: 'Request too large. Try analyzing fewer emails.'
            };
        }

        return {
            success: false,
            error: 'Failed to analyze emails: ' + error.message
        };
    }
}

// Helper function to clean and structure topics
function structureTopics(topics) {
    if (!Array.isArray(topics)) return [];

    return topics
        .filter(topic => topic && typeof topic === 'string')
        .map(topic => topic.trim())
        .filter(topic => topic.length > 0);
}

module.exports = {
    analyzeEmails
}; 
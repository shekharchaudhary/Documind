# DocuMind AI

> Transform your document management with AI-powered insights and intelligent organization

DocuMind AI is a cutting-edge document management system that leverages artificial intelligence to revolutionize how you interact with and understand your documents. By combining advanced natural language processing, machine learning, and intelligent organization capabilities, DocuMind AI transforms your document collection into an interactive knowledge base.

## 🚀 Key Highlights

- **Smart Document Analysis**: Automatically extract insights, summaries, and key information from your documents
- **Intelligent Organization**: AI-powered categorization and tagging system that learns from your content
- **Natural Language Search**: Find exactly what you need using conversational queries
- **Multi-Format Support**: Seamlessly handle PDFs, Word documents, spreadsheets, images, and more
- **Interactive Insights**: Visualize relationships between documents and discover hidden patterns
- **Security-First**: Enterprise-grade security with sensitive information detection

## Features

- AI-powered file organization
- Automatic tagging based on file content and metadata
- Support for multiple file types (PDFs, Excel, Word, Images, etc.)
- Local SQLite database for file indexing
- React-based user interface
- Node.js backend with Express

## AI-Powered Document Analysis

Our advanced AI-powered document analysis system provides:

### Deep Content Understanding

- Automatic extraction of key topics and themes
- Identification of important entities (names, organizations, dates)
- Summary generation for quick document overview
- Sentiment analysis and tone detection

### Smart Document Classification

- Automatic categorization based on content and context
- Industry-specific document type detection
- Multi-language support and translation capabilities
- Version comparison and similarity detection

### Intelligent Insights

- Key information extraction and highlighting
- Related document recommendations
- Pattern recognition across document collections
- Compliance and sensitive information detection

### Interactive Analysis

- Natural language querying of document content
- Dynamic visualization of document relationships
- Real-time content analysis and tagging
- Custom analysis rules and workflows

## Prerequisites

- Node.js (v14 or higher)
- npm (v6 or higher)
- OpenAI API key

## Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd collage-ai
```

2. Install dependencies:

```bash
npm run install-all
```

3. Configure environment variables:

- Copy `.env.example` to `.env`
- Add your OpenAI API key to the `.env` file

4. Start the application:

```bash
npm start
```

The application will start with:

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

## Usage

1. **File Indexing**

   - The system automatically indexes supported files
   - Files are analyzed for content and metadata
   - AI-generated tags are created based on file content

2. **Managing Tags**

   - View and manage tags through the web interface
   - Add custom tags to files
   - Override or modify AI-generated tags

3. **Searching**
   - Search files by name, content, or tags
   - Filter results by file type or date

## Supported File Types

- PDF documents
- Microsoft Word documents (.doc, .docx)
- Text files (.txt)
- Images (.jpg, .jpeg, .png)
- Excel files (.xls, .xlsx)

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

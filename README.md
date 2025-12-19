# Berkshire Hathaway Intelligence

A RAG (Retrieval-Augmented Generation) chatbot that answers questions about Warren Buffett's investment philosophy using Berkshire Hathaway's annual shareholder letters.

## Overview

This application uses AI to help you explore decades of investment wisdom from Warren Buffett. It reads through all of Berkshire Hathaway's shareholder letters, understands your questions, finds relevant information, and provides detailed answers with proper citations.

Built with the Mastra framework, it combines vector search with GPT-4o to deliver accurate, context-aware responses while maintaining conversation history.

## Pre-requisites

Before you start, make sure you have these installed:

- **Node.js** (v18 or higher)
- **PostgreSQL** (v14 or higher)
- **npm**
- **Git**

You'll also need:
- OpenAI API key (for GPT-4o and embeddings)
- PostgreSQL running locally or a connection string

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Aditisalvi/Berkshire-Hathaway-Intelligence-RAG-project.git
cd berkshire-rag
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:

```bash
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Model Selection
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai

# Database Connection
POSTGRES_CONNECTION_STRING=postgresql://username:password@localhost:5432/berkshire_rag

# Server Configuration
MASTRA_PORT=4111
MASTRA_HOST=localhost

# Authentication
JWT_SECRET=your_secure_secret_key_here
```

### 4. Set Up the Database

First, create the database and run the schema:

```bash
# Drop old database if exists and create fresh schema
psql postgres -c "DROP DATABASE IF EXISTS berkshire_rag;"
psql postgres -f schema.sql
```

This will create all necessary tables (users, conversations, messages) and enable the pgvector extension.

### 5. Ingest Documents

Process and store the documents in the vector database:

```bash
npm run ingest
```

This will take a few minutes. You'll see progress updates as each letter is processed.

### 6. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
berkshire-rag/
│
├── app/                          # Next.js app directory (frontend + API routes)
│   ├── api/                      # Backend API endpoints
│   │   ├── auth/                 # Authentication routes (login, signup)
│   │   ├── chat/                 # Main chat endpoint (handles AI conversations)
│   │   ├── conversations/        # CRUD operations for conversations
│   │   └── messages/             # Message storage and retrieval
│   │
│   ├── auth/                     # Login/signup page
│   ├── chat/                     # Main chat interface
│   ├── components/               # React components
│   │   ├── CitationParser.tsx   # Parses and links year citations to source letters
│   │   └── ConversationSidebar.tsx  # Left sidebar showing chat history
│   │
│   ├── globals.css               # Global styles
│   ├── layout.tsx                # Root layout component
│   └── page.tsx                  # Home page (redirects to auth or chat)
│
├── src/
│   ├── lib/                      # Core utilities
│   │   ├── auth.ts               # JWT authentication logic
│   │   ├── db.ts                 # Database operations (users, conversations, messages)
│   │   └── model-config.ts       # AI model configuration (GPT-4o, embeddings)
│   │
│   ├── mastra/                   # Mastra framework setup
│   │   ├── index.ts              # Main Mastra instance with agent and vector store
│   │   ├── agents/
│   │   │   └── berkshire-agent.ts    # AI agent with financial expertise
│   │   └── tools/
│   │       └── berkshire-query-tool.ts   # Vector search tool for RAG
│   │
│   └── scripts/
│       └── ingest-documents.ts   # Document processing and vector storage script
│
├── documents/                    # Shareholder letters (PDFs) - not in git
├── public/
│   └── letters.json              # Metadata for all letters (years, URLs)
│
├── .env                          # Environment variables (API keys, database config)
├── .gitignore                    # Git ignore rules
├── next.config.js                # Next.js configuration
├── next-env.d.ts                 # TypeScript declarations for Next.js
├── tsconfig.json                 # TypeScript compiler configuration
├── package.json                  # Project dependencies and scripts
├── package-lock.json             # Locked versions of dependencies
├── schema.sql                    # Database schema creation script
└── README.md                     # Project documentation
```

## How It Works

### Document Ingestion Flow

When you run `npm run ingest`, here's what happens:

1. **PDF Parsing**: The script reads all PDF files from the `documents/` folder and extracts text using `pdf-parse`.

2. **Chunking**: Each letter is broken down into smaller chunks (1000 characters with 200-character overlap) to fit within the AI's context window.

3. **Embedding Generation**: Each chunk is converted into a vector embedding using OpenAI's `text-embedding-3-small` model. These embeddings capture the semantic meaning of the text.

4. **Vector Storage**: All embeddings are stored in PostgreSQL with the pgvector extension, along with metadata (year, title, source).

5. **Indexing**: An HNSW index is created for fast similarity searches.

The result is a searchable knowledge base of all shareholder letters.

### Chat Flow

When you ask a question, here's the journey your query takes:

1. **Authentication**: Your JWT token is verified to ensure you're logged in.

2. **Message Storage**: Your question is saved to the database under the current conversation.

3. **Agent Processing**: The Mastra agent receives your question along with conversation history for context.

4. **Tool Usage**: The agent automatically decides to use the `berkshireQueryTool` to search for relevant information.

5. **Vector Search**: 
   - Your question is converted to a vector embedding
   - PostgreSQL finds the 5 most similar chunks from the letters
   - These chunks are returned with their metadata (year, source)

6. **Response Generation**: 
   - GPT-4o receives your question plus the relevant context from the letters
   - It generates a comprehensive answer grounded in the source material
   - The response includes proper citations with years

7. **Streaming**: The answer is streamed back to you in real-time, so you see it being written word by word.

8. **Storage**: Once complete, the assistant's response is saved to the database.

The conversation history is maintained throughout, so follow-up questions work naturally ("Can you elaborate on that?" or "What about diversification?").

### Why RAG (Retrieval-Augmented Generation)?

Without RAG, GPT-4o would only use its training data, which has a cutoff date and might contain outdated or incorrect information about Berkshire. With RAG, we:

- Ground responses in actual shareholder letters (primary sources)
- Provide specific citations with years
- Handle questions about recent letters (2023, 2024)
- Ensure factual accuracy

The agent acts like a research assistant who has read all the letters and can quickly find and cite the relevant passages.

## Features

- **Intelligent Q&A**: Ask anything about Buffett's investment philosophy, Berkshire's strategy, or company performance
- **Source Citations**: Every answer includes references to specific years and letters
- **Conversation Memory**: Follow-up questions understand previous context
- **Streaming Responses**: See answers being generated in real-time
- **Conversation Management**: Save and revisit past conversations
- **User Authentication**: Secure login system with JWT tokens

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Next.js API Routes (Node.js)
- **AI Framework**: Mastra
- **LLM**: OpenAI GPT-4o (gpt-4o-2024-08-06)
- **Embeddings**: OpenAI text-embedding-3-small (1536 dimensions)
- **Database**: PostgreSQL 14+ with pgvector extension
- **Authentication**: JWT with bcrypt
- **PDF Processing**: pdf-parse
- **Streaming**: Vercel AI SDK

## Troubleshooting

**Issue: "Agent not found" error**
- Make sure you've run `npm install` to install all dependencies
- Check that the Mastra instance is properly initialized in `src/mastra/index.ts`

**Issue: "No results from vector search"**
- Run `npm run ingest` to populate the vector database
- Verify documents are in the `documents/` folder
- Check PostgreSQL connection string in `.env`

**Issue: "OpenAI API error"**
- Verify your API key in `.env`
- Check you have sufficient API credits
- Ensure you're using the correct model names

**Issue: Database connection failed**
- Make sure PostgreSQL is running: `psql postgres`
- Verify credentials in connection string
- Check if pgvector extension is installed: `CREATE EXTENSION vector;`

## License

This project is created for educational purposes as part of the Pazago Drive internship assignment.
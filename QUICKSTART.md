# Quick Start Guide

Get the Berkshire Hathaway Intelligence RAG application running in 15 minutes.

## Prerequisites Checklist

Before starting, ensure you have:

- [ ] Node.js 18 or higher installed
- [ ] PostgreSQL 14 or higher installed
- [ ] OpenAI API key (get one at https://platform.openai.com/api-keys)
- [ ] Basic terminal/command line knowledge
- [ ] Text editor (VS Code recommended)

## Step 1: Install PostgreSQL with pgvector (5 minutes)

### On macOS

```bash
# Install PostgreSQL
brew install postgresql@14

# Install pgvector
brew install pgvector

# Start PostgreSQL
brew services start postgresql@14

# Create database
createdb berkshire_rag

# Enable pgvector extension
psql berkshire_rag -c "CREATE EXTENSION vector;"
```

### On Ubuntu/Linux

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql-14 postgresql-contrib

# Install pgvector
sudo apt-get install postgresql-14-pgvector

# Start PostgreSQL
sudo service postgresql start

# Create database
sudo -u postgres createdb berkshire_rag
sudo -u postgres psql berkshire_rag -c "CREATE EXTENSION vector;"
```

### On Windows

1. Download PostgreSQL from https://www.postgresql.org/download/windows/
2. Install PostgreSQL 14+
3. Download pgvector binary from https://github.com/pgvector/pgvector/releases
4. Install pgvector following their Windows instructions
5. Create database using pgAdmin or psql

## Step 2: Set Up the Project (3 minutes)

```bash
# Navigate to project directory
cd berkshire-rag

# Install dependencies
npm install

# This will take 2-3 minutes
```

## Step 3: Configure Environment (2 minutes)

```bash
# Copy environment template
cp .env.example .env

# Edit .env file with your favorite editor
# For example, using nano:
nano .env
```

Add your credentials:

```env
# API Keys (you need at least one)
OPENAI_API_KEY=sk-your-actual-openai-key-here
GOOGLE_GENERATIVE_AI_API_KEY=your-google-api-key-here

# Model Selection (optional - defaults to OpenAI)
LLM_PROVIDER=openai          # or 'gemini'
EMBEDDING_PROVIDER=openai    # or 'gemini'

# Database
POSTGRES_CONNECTION_STRING=postgresql://YOUR_USER:YOUR_PASSWORD@localhost:5432/berkshire_rag
```

**Important**: Replace:
- `YOUR_USER` with your PostgreSQL username (often `postgres` or your system username)
- `YOUR_PASSWORD` with your PostgreSQL password

**Model Options**:
- **Default (OpenAI)**: Best for production, proven reliability
- **Gemini**: Lower cost, faster, good for development
- **Mixed**: Combine models for cost optimization

See `MODEL_CONFIG.md` for detailed model comparison and configuration.

To find your PostgreSQL username:
```bash
psql -c "\du" postgres
```

## Step 4: Download Documents (2 minutes)

1. Create documents directory:
   ```bash
   mkdir documents
   ```

2. Download Berkshire Hathaway shareholder letters from the Google Drive link provided in the assignment

3. Place all PDF files in the `documents/` directory

4. Verify files are there:
   ```bash
   ls documents/
   # Should show: berkshire-2019.pdf, berkshire-2020.pdf, etc.
   ```

## Step 5: Ingest Documents (3 minutes)

```bash
# Run the ingestion script
npm run ingest

# This will take 2-3 minutes depending on the number of documents
# You'll see progress for each PDF file
```

Expected output:
```
Starting document ingestion process...
Found 6 PDF files to process

Processing: berkshire-2019.pdf
  Chunking document...
  Created 145 chunks
  Generating embeddings...
  Storing vectors in database...
  Successfully processed berkshire-2019.pdf

[... continues for each file ...]

=== Ingestion Complete ===
Total documents processed: 6
Total chunks created: 847
```

## Step 6: Start the Application (1 minute)

```bash
# Start the development server
npm run dev
```

You'll see:
```
INFO [Mastra]: Mastra API running on port http://localhost:4111/api
INFO [Mastra]: Playground available at http://localhost:4111/
```

Open your browser:
- **Main Application**: http://localhost:3000
- **Mastra Studio**: http://localhost:4111

## Step 7: Test It Out!

1. Go to http://localhost:3000
2. Try this question: "What does Warren Buffett think about cryptocurrency?"
3. Watch the response stream in real-time
4. Ask a follow-up: "Can you elaborate on why?"

## Troubleshooting

### PostgreSQL won't start

```bash
# Check status
brew services list  # macOS
sudo service postgresql status  # Linux

# Restart
brew services restart postgresql@14  # macOS
sudo service postgresql restart  # Linux
```

### Can't connect to database

```bash
# Test connection manually
psql postgresql://localhost:5432/berkshire_rag

# If this fails, check:
# 1. Is PostgreSQL running?
# 2. Does the database exist?
# 3. Are credentials correct?
```

### OpenAI API errors

```bash
# Test your API key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer YOUR_API_KEY"

# Should return a list of models
# If not, your key is invalid or expired
```

### Documents not found

```bash
# Ensure documents directory exists and has files
ls -la documents/

# Should show .pdf files, not empty
```

### Port already in use

```bash
# If port 3000 is in use, change it:
PORT=3001 npm run dev

# Or kill the process using the port:
lsof -ti:3000 | xargs kill -9  # macOS/Linux
```

## Verification Checklist

After completing all steps:

- [ ] PostgreSQL is running
- [ ] pgvector extension is installed
- [ ] Environment variables are set
- [ ] Documents are in `documents/` directory
- [ ] Ingestion completed successfully
- [ ] Application is running at http://localhost:3000
- [ ] Mastra Studio accessible at http://localhost:4111
- [ ] Can ask questions and get responses

## Next Steps

Now that everything is running:

1. **Read the documentation**:
   - README.md for detailed setup
   - TESTING.md for testing procedures
   - DEPLOYMENT.md for production deployment
   - PROJECT.md for technical details

2. **Test different queries**:
   - Investment philosophy questions
   - Business strategy inquiries
   - Historical comparisons
   - Management evaluation criteria

3. **Explore Mastra Studio**:
   - View agent traces
   - Check tool calls
   - Monitor performance
   - Debug issues

4. **Customize the agent**:
   - Modify instructions in `src/mastra/agents/berkshire-agent.ts`
   - Adjust chunking in `src/scripts/ingest-documents.ts`
   - Update UI in `app/components/ChatInterface.tsx`

## Common Questions

**Q: How long does ingestion take?**
A: About 2-3 minutes for 6 documents (2019-2024).

**Q: Can I add more documents?**
A: Yes! Just add PDFs to `documents/` and run `npm run ingest` again.

**Q: How do I reset the database?**
A: Drop and recreate:
```bash
dropdb berkshire_rag
createdb berkshire_rag
psql berkshire_rag -c "CREATE EXTENSION vector;"
npm run ingest
```

**Q: Can I use a different LLM?**
A: Yes! Mastra supports 1113 models. See `src/mastra/agents/berkshire-agent.ts` to change the model.

**Q: How do I deploy to production?**
A: See DEPLOYMENT.md for complete instructions for Vercel, AWS, Docker, and more.

**Q: Is there a Docker setup?**
A: Yes! See DEPLOYMENT.md for the docker-compose configuration.

## Getting Help

If you encounter issues:

1. Check the error message carefully
2. Review the troubleshooting section above
3. Consult the full README.md
4. Check Mastra documentation: https://mastra.ai/docs
5. Verify all prerequisites are met

## Success!

If you've made it this far and everything is working, congratulations! You have a fully functional RAG application powered by Mastra.

Try asking complex questions, testing the memory system with follow-ups, and exploring the different features.

Happy building! 🚀

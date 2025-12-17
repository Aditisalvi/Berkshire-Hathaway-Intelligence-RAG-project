import { MDocument } from '@mastra/rag';
import { PgVector } from '@mastra/pg';
import { embedMany } from 'ai';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { getEmbeddingModel, getModelConfig } from '../lib/model-config';

// Load environment variables explicitly (important for Windows)
import * as dotenv from 'dotenv';
dotenv.config();

const DOCUMENTS_DIR = path.join(process.cwd(), 'documents');
const INDEX_NAME = 'berkshire_letters';
const EMBEDDING_DIMENSION = 768; // Gemini uses 768, OpenAI uses 1536

interface DocumentMetadata {
  year: number;
  title: string;
  filename: string;
  source: string;
}

async function extractPDFText(filePath: string): Promise<string> {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (error) {
    console.error(`Error parsing PDF ${filePath}:`, error);
    throw error;
  }
}

function extractYearFromFilename(filename: string): number {
  const match = filename.match(/(\d{4})/);
  return match ? parseInt(match[1]) : 0;
}

function getEmbeddingDimension(): number {
  const config = getModelConfig();
  return config.embeddingProvider === 'gemini' ? 768 : 1536;
}

async function processPDFDocuments(): Promise<void> {
  console.log('Starting document ingestion process...');
  console.log(`Using ${getModelConfig().embeddingProvider} for embeddings`);
  
  // Verify connection string is set
  if (!process.env.POSTGRES_CONNECTION_STRING) {
    throw new Error(
      'POSTGRES_CONNECTION_STRING environment variable is not set!\n' +
      'Please create a .env file with:\n' +
      'POSTGRES_CONNECTION_STRING=postgresql://user:password@localhost:5432/berkshire_rag\n' +
      'GOOGLE_GENERATIVE_AI_API_KEY=your_google_api_key\n' +
      'LLM_PROVIDER=gemini\n' +
      'EMBEDDING_PROVIDER=gemini'
    );
  }
  
  console.log('Database connection configured');
  
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    throw new Error(`Documents directory not found at ${DOCUMENTS_DIR}. Please create it and add PDF files.`);
  }

  const pdfFiles = fs.readdirSync(DOCUMENTS_DIR).filter(file => file.endsWith('.pdf'));
  
  if (pdfFiles.length === 0) {
    throw new Error(`No PDF files found in ${DOCUMENTS_DIR}`);
  }

  console.log(`Found ${pdfFiles.length} PDF files to process`);

  const pgVector = new PgVector({
    connectionString: process.env.POSTGRES_CONNECTION_STRING!,
  });

  const embeddingDimension = getEmbeddingDimension();
  console.log(`Using embedding dimension: ${embeddingDimension}`);

  await pgVector.createIndex({
    indexName: INDEX_NAME,
    dimension: embeddingDimension,
  });
  console.log(`Created or verified index: ${INDEX_NAME}`);

  let totalChunks = 0;

  for (const pdfFile of pdfFiles) {
    console.log(`\nProcessing: ${pdfFile}`);
    const filePath = path.join(DOCUMENTS_DIR, pdfFile);
    
    const text = await extractPDFText(filePath);
    const year = extractYearFromFilename(pdfFile);
    
    const metadata: DocumentMetadata = {
      year,
      title: `Berkshire Hathaway ${year} Shareholder Letter`,
      filename: pdfFile,
      source: `Berkshire Hathaway Annual Letter ${year}`,
    };

    const doc = MDocument.fromText(text, metadata);

    console.log(`  Chunking document...`);
    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize: 1000,
      overlap: 200,
    });

    console.log(`  Created ${chunks.length} chunks`);

    console.log(`  Generating embeddings...`);
    
    // Batch embeddings to respect API limits (Gemini: 100 per batch, OpenAI: no strict limit)
    const BATCH_SIZE = getModelConfig().embeddingProvider === 'gemini' ? 100 : 500;
    const allEmbeddings: number[][] = [];
    
    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batchChunks = chunks.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
      
      console.log(`    Batch ${batchNum}/${totalBatches}: Processing ${batchChunks.length} chunks...`);
      
      const { embeddings } = await embedMany({
        values: batchChunks.map(chunk => chunk.text),
        model: getEmbeddingModel(),
      });
      
      allEmbeddings.push(...embeddings);
      
      // Small delay between batches to avoid rate limiting
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`  Storing vectors in database...`);
    await pgVector.upsert({
      indexName: INDEX_NAME,
      vectors: allEmbeddings,
      metadata: chunks.map((chunk, index) => ({
        text: chunk.text,
        year: metadata.year,
        title: metadata.title,
        filename: metadata.filename,
        source: metadata.source,
        chunkIndex: index,
        totalChunks: chunks.length,
      })),
    });

    totalChunks += chunks.length;
    console.log(`  Successfully processed ${pdfFile}`);
  }

  console.log(`\n=== Ingestion Complete ===`);
  console.log(`Total documents processed: ${pdfFiles.length}`);
  console.log(`Total chunks created: ${totalChunks}`);
  console.log(`Vector index: ${INDEX_NAME}`);
  console.log(`Embedding provider: ${getModelConfig().embeddingProvider}`);
  console.log(`Embedding dimension: ${embeddingDimension}`);
}

if (require.main === module) {
  processPDFDocuments()
    .then(() => {
      console.log('\nDocument ingestion completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\nDocument ingestion failed:', error);
      process.exit(1);
    });
}

export { processPDFDocuments };
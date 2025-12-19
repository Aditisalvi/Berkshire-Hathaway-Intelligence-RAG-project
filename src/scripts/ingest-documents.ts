import { MDocument } from '@mastra/rag';
import { PgVector } from '@mastra/pg';
import { embedMany } from 'ai';
import * as fs from 'fs';
import * as path from 'path';
import pdfParse from 'pdf-parse';
import { getEmbeddingModel, getEmbeddingDimension } from '../lib/model-config';

import * as dotenv from 'dotenv';
dotenv.config();

const DOCUMENTS_DIR = path.join(process.cwd(), 'documents');
const INDEX_NAME = 'berkshire_letters';

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

async function processPDFDocuments(): Promise<void> {
  console.log('\nStarting document ingestion...');
  
  const embeddingDimension = getEmbeddingDimension();
  console.log(`Using OpenAI embeddings (${embeddingDimension}d)`);
  
  // Check environment variables
  if (!process.env.POSTGRES_CONNECTION_STRING) {
    throw new Error('POSTGRES_CONNECTION_STRING is not set in .env file');
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is required');
  }
  
  // Check documents directory
  if (!fs.existsSync(DOCUMENTS_DIR)) {
    throw new Error(`Documents directory not found: ${DOCUMENTS_DIR}`);
  }

  const pdfFiles = fs.readdirSync(DOCUMENTS_DIR).filter(file => file.endsWith('.pdf'));
  
  if (pdfFiles.length === 0) {
    throw new Error(`No PDF files found in ${DOCUMENTS_DIR}`);
  }

  console.log(`Found ${pdfFiles.length} PDF files\n`);

  // Initialize vector database
  const pgVector = new PgVector({
    connectionString: process.env.POSTGRES_CONNECTION_STRING!,
  });

  await pgVector.createIndex({
    indexName: INDEX_NAME,
    dimension: embeddingDimension,
  });

  let totalChunks = 0;
  const startTime = Date.now();

  // Process each PDF file
  for (let i = 0; i < pdfFiles.length; i++) {
    const pdfFile = pdfFiles[i];
    console.log(`Processing [${i + 1}/${pdfFiles.length}]: ${pdfFile}`);
    
    const filePath = path.join(DOCUMENTS_DIR, pdfFile);
    const text = await extractPDFText(filePath);
    const year = extractYearFromFilename(pdfFile);
    
    const metadata: DocumentMetadata = {
      year,
      title: `Berkshire Hathaway ${year} Shareholder Letter`,
      filename: pdfFile,
      source: `Berkshire Hathaway Annual Letter ${year}`,
    };

    // Create document and chunk it
    const doc = MDocument.fromText(text, metadata);
    const chunks = await doc.chunk({
      strategy: 'recursive',
      maxSize: 1000,
      overlap: 200,
    });

    console.log(`  Created ${chunks.length} chunks`);

    // Generate embeddings in batches
    const BATCH_SIZE = 500;
    const allEmbeddings: number[][] = [];
    
    for (let j = 0; j < chunks.length; j += BATCH_SIZE) {
      const batchChunks = chunks.slice(j, j + BATCH_SIZE);
      
      const { embeddings } = await embedMany({
        values: batchChunks.map(chunk => chunk.text),
        model: getEmbeddingModel(),
      });
      
      allEmbeddings.push(...embeddings);
      
      // Brief delay to avoid rate limiting
      if (j + BATCH_SIZE < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Store in database
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
    console.log(`  ✅ Done\n`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`Ingestion complete!`);
  console.log(`Processed ${pdfFiles.length} documents, ${totalChunks} chunks in ${duration}s\n`);
}

if (require.main === module) {
  processPDFDocuments()
    .then(() => {
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Ingestion failed:', error.message);
      process.exit(1);
    });
}

export { processPDFDocuments };
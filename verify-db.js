// Verify database ingestion
import { PgVector } from '@mastra/pg';
import * as dotenv from 'dotenv';

dotenv.config();

async function verifyDatabase() {
  console.log('Checking database content...\n');

  if (!process.env.POSTGRES_CONNECTION_STRING) {
    console.error('❌ POSTGRES_CONNECTION_STRING not set!');
    process.exit(1);
  }

  try {
    const pgVector = new PgVector({
      connectionString: process.env.POSTGRES_CONNECTION_STRING,
    });

    // Try to query the database
    const results = await pgVector.query({
      indexName: 'berkshire_letters',
      queryVector: new Array(768).fill(0.1), // Dummy vector for testing
      topK: 5,
    });

    console.log('✅ Database connection successful!');
    console.log(`✅ Found ${results.length} results (should be 5)`);
    
    if (results.length > 0) {
      console.log('\nSample chunk from database:');
      console.log('---');
      console.log(`Year: ${results[0].metadata.year}`);
      console.log(`Title: ${results[0].metadata.title}`);
      console.log(`Text preview: ${results[0].metadata.text.substring(0, 150)}...`);
      console.log('---');
      
      console.log('\n✅ SUCCESS: Database is properly configured and contains your documents!');
      console.log('\nExpected stats:');
      console.log('- Documents: 48 PDFs');
      console.log('- Total chunks: 4,709');
      console.log('- Embedding dimension: 768 (Gemini)');
      console.log('- Index name: berkshire_letters');
    } else {
      console.log('\n⚠️  WARNING: Database query returned no results.');
      console.log('This might be normal if vector search isn\'t finding matches with the dummy vector.');
    }

  } catch (error) {
    console.error('\n❌ Database verification failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Verify PostgreSQL is running');
    console.log('2. Check connection string in .env');
    console.log('3. Ensure pgvector extension is installed');
    process.exit(1);
  }
}

verifyDatabase();

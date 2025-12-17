# Testing Guide

Comprehensive testing procedures for the Berkshire Hathaway Intelligence RAG application.

## Test Environment Setup

### 1. Prerequisites

```bash
# Install dependencies
npm install

# Set up test environment variables
cp .env.example .env.test
```

### 2. Test Database

Create a separate test database:

```bash
psql postgres
CREATE DATABASE berkshire_rag_test;
\c berkshire_rag_test
CREATE EXTENSION vector;
\q
```

Update `.env.test`:

```env
POSTGRES_CONNECTION_STRING=postgresql://user:password@localhost:5432/berkshire_rag_test
```

## Functional Testing

### Document Processing Tests

#### Test 1: PDF Parsing

**Objective**: Verify PDF text extraction works correctly

**Steps**:
1. Place a sample PDF in `documents/` directory
2. Run ingestion script
3. Check console output

**Expected Output**:
```
Processing: berkshire-2023.pdf
  Chunking document...
  Created 156 chunks
  Generating embeddings...
  Storing vectors in database...
  Successfully processed berkshire-2023.pdf
```

**Pass Criteria**:
- No errors during processing
- Chunks created > 0
- Vectors stored successfully

#### Test 2: Document Chunking

**Objective**: Verify chunking strategy produces appropriate segments

**Test Query**:
```bash
psql $POSTGRES_CONNECTION_STRING -c "
SELECT 
  COUNT(*) as total_chunks,
  AVG(LENGTH(text)) as avg_chunk_length,
  MIN(LENGTH(text)) as min_chunk_length,
  MAX(LENGTH(text)) as max_chunk_length
FROM vectors;
"
```

**Expected Results**:
- avg_chunk_length: 800-1200 characters
- min_chunk_length: > 100 characters
- max_chunk_length: < 1500 characters

#### Test 3: Metadata Extraction

**Objective**: Verify metadata is correctly attached to chunks

**Test Query**:
```bash
psql $POSTGRES_CONNECTION_STRING -c "
SELECT 
  metadata->>'year' as year,
  metadata->>'title' as title,
  COUNT(*) as chunks
FROM vectors
GROUP BY year, title
ORDER BY year;
"
```

**Expected Results**:
- Each year has associated chunks
- Titles are properly formatted
- No NULL values in critical metadata

### Vector Storage Tests

#### Test 4: Vector Search

**Objective**: Verify similarity search returns relevant results

**Test Script** (`test-vector-search.ts`):
```typescript
import { PgVector } from '@mastra/pg';
import { openai } from '@ai-sdk/openai';
import { embed } from 'ai';

const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

async function testVectorSearch() {
  const testQuery = "What is Warren Buffett's investment philosophy?";
  
  const { embedding } = await embed({
    value: testQuery,
    model: openai.embedding('text-embedding-3-small'),
  });

  const results = await pgVector.query({
    indexName: 'berkshire_letters',
    queryVector: embedding,
    topK: 5,
  });

  console.log('Search Results:');
  results.forEach((result, index) => {
    console.log(`\nResult ${index + 1}:`);
    console.log('Score:', result.score);
    console.log('Year:', result.metadata.year);
    console.log('Preview:', result.metadata.text.substring(0, 200) + '...');
  });
}

testVectorSearch();
```

**Run Test**:
```bash
tsx test-vector-search.ts
```

**Pass Criteria**:
- Returns 5 results
- Relevance scores > 0.7
- Results related to investment philosophy
- Results from multiple years

### Agent and Memory Tests

#### Test 5: Agent Response Quality

**Objective**: Verify agent provides accurate, grounded responses

**Test Cases**:

```bash
# Test Case 1: Simple factual query
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What does Warren Buffett think about cryptocurrency?"}
    ],
    "threadId": "test-1"
  }' | jq .
```

**Expected**:
- Response includes specific quotes
- Citations include year references
- Answer is grounded in documents
- No hallucinations

```bash
# Test Case 2: Multi-year comparison
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "How has Berkshire'\''s acquisition strategy changed from 2019 to 2024?"}
    ],
    "threadId": "test-2"
  }' | jq .
```

**Expected**:
- Comparison across multiple years
- Specific examples from different letters
- Temporal context provided
- Accurate year attributions

#### Test 6: Conversation Memory

**Objective**: Verify agent maintains context across turns

**Test Sequence**:

```bash
# Turn 1
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What are Buffett'\''s key investment principles?"}
    ],
    "threadId": "memory-test"
  }' | jq .

# Turn 2 - Follow-up without repeating context
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What are Buffett'\''s key investment principles?"},
      {"role": "assistant", "content": "...previous response..."},
      {"role": "user", "content": "Can you elaborate on the first principle?"}
    ],
    "threadId": "memory-test"
  }' | jq .
```

**Expected**:
- Agent remembers previous conversation
- Provides specific detail on referenced principle
- No request for clarification
- Maintains conversation context

#### Test 7: Tool Usage

**Objective**: Verify agent correctly uses vector query tool

**Monitoring**:
- Check Mastra Studio at http://localhost:4111
- View agent traces
- Verify tool calls

**Expected Behavior**:
- Tool called for knowledge queries
- Multiple tool calls for complex questions
- Proper parameters passed to tool
- Results integrated into response

### UI and Streaming Tests

#### Test 8: Frontend Loading

**Objective**: Verify UI loads and displays correctly

**Steps**:
1. Navigate to http://localhost:3000
2. Check console for errors
3. Verify all components render

**Checklist**:
- [ ] Header displays correctly
- [ ] Welcome message shows
- [ ] Example questions render
- [ ] Input field is functional
- [ ] Send button is enabled
- [ ] No console errors

#### Test 9: Message Streaming

**Objective**: Verify real-time streaming works

**Steps**:
1. Enter a test question
2. Click Send
3. Observe response behavior

**Expected Behavior**:
- Loading indicator appears immediately
- Response streams token-by-token
- No full-screen loading
- Message updates smoothly
- Final response is complete

#### Test 10: Error Handling

**Objective**: Verify graceful error handling

**Test Cases**:

```javascript
// Test 1: Empty message
// Expected: Submit button disabled

// Test 2: Very long message (>4000 chars)
// Expected: Graceful truncation or validation error

// Test 3: API timeout
// Expected: Error message displayed, no app crash

// Test 4: Invalid characters
// Expected: Proper sanitization or error handling
```

### Performance Benchmarks

#### Test 11: Response Time

**Objective**: Measure end-to-end latency

**Test Script** (`benchmark-response.ts`):

```typescript
async function benchmarkResponses() {
  const queries = [
    "What is Warren Buffett's investment philosophy?",
    "How does Berkshire evaluate acquisitions?",
    "What is Buffett's view on diversification?",
  ];

  for (const query of queries) {
    const start = Date.now();
    
    await fetch('http://localhost:3000/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: query }],
        threadId: `bench-${Date.now()}`,
      }),
    });

    const duration = Date.now() - start;
    console.log(`Query: ${query}`);
    console.log(`Duration: ${duration}ms\n`);
  }
}

benchmarkResponses();
```

**Performance Targets**:
- First token: < 2 seconds
- Complete response: < 10 seconds
- Vector search: < 500ms
- Embedding generation: < 1 second

#### Test 12: Concurrent Users

**Objective**: Test system under load

**Load Test** (using Apache Bench):

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Create test payload
cat > test-payload.json << EOF
{
  "messages": [
    {"role": "user", "content": "What is value investing?"}
  ],
  "threadId": "load-test"
}
EOF

# Run load test
ab -n 100 -c 10 -p test-payload.json -T application/json \
  http://localhost:3000/api/chat
```

**Acceptable Results**:
- 0% failed requests
- Mean response time < 15 seconds
- No database connection errors
- No memory leaks

### Integration Tests

#### Test 13: End-to-End Flow

**Objective**: Verify complete user journey

**Scenario**: New user asking multiple related questions

**Steps**:
1. Open application
2. Click example question
3. Wait for response
4. Ask follow-up question
5. Verify citations
6. Start new conversation

**Pass Criteria**:
- All steps complete without errors
- Responses are relevant and accurate
- Memory persists within conversation
- Citations are properly formatted
- New conversation resets context

#### Test 14: Document Update Flow

**Objective**: Verify new documents can be added

**Steps**:
1. Add new PDF to documents/
2. Run ingestion script
3. Query for information from new document
4. Verify response includes new content

**Expected**:
- Ingestion completes successfully
- New chunks added to database
- Queries retrieve new content
- No impact on existing documents

## Sample Test Cases

### Query 1: Investment Philosophy

**Input**: "What does Warren Buffett think about cryptocurrency?"

**Expected Response Should Include**:
- Specific quotes about cryptocurrency
- Year references (likely 2021-2024)
- Buffett's skeptical views
- Comparison to productive assets
- Citations to specific letters

**Validation**:
- [ ] Response is grounded in documents
- [ ] Includes specific quotes
- [ ] Cites years correctly
- [ ] Matches Buffett's known views
- [ ] No fabricated information

### Query 2: Evolution of Strategy

**Input**: "How has Berkshire's investment strategy evolved over the past 5 years?"

**Expected Response Should Include**:
- Comparison across years 2019-2024
- Specific strategy changes
- Examples of acquisitions or dispositions
- Contextual factors (COVID, inflation, etc.)
- Multiple citations spanning years

**Validation**:
- [ ] Temporal analysis present
- [ ] Multiple years referenced
- [ ] Specific examples provided
- [ ] Logical progression shown
- [ ] Accurate timeline

### Query 3: Management Quality

**Input**: "How does Buffett evaluate management quality in potential investments?"

**Expected Response Should Include**:
- Key criteria for management evaluation
- Specific characteristics valued
- Examples from letters
- Quotes about leadership
- Historical context

**Validation**:
- [ ] Comprehensive criteria listed
- [ ] Supported by quotes
- [ ] Consistent with known principles
- [ ] Properly sourced
- [ ] Well-structured response

## Automated Test Suite

### Unit Tests Setup

Create `tests/` directory:

```bash
mkdir -p tests/{unit,integration,e2e}
```

### Example Unit Test (`tests/unit/chunking.test.ts`):

```typescript
import { MDocument } from '@mastra/rag';

describe('Document Chunking', () => {
  test('should create chunks within size limits', async () => {
    const sampleText = "...long text...";
    const doc = MDocument.fromText(sampleText);
    
    const chunks = await doc.chunk({
      strategy: 'recursive',
      size: 1000,
      overlap: 200,
    });

    chunks.forEach(chunk => {
      expect(chunk.text.length).toBeLessThanOrEqual(1200);
      expect(chunk.text.length).toBeGreaterThan(100);
    });
  });

  test('should preserve metadata', async () => {
    const metadata = { year: 2023, title: 'Test' };
    const doc = MDocument.fromText('text', metadata);
    
    const chunks = await doc.chunk({
      strategy: 'recursive',
      size: 1000,
    });

    chunks.forEach(chunk => {
      expect(chunk.metadata).toMatchObject(metadata);
    });
  });
});
```

## Test Checklist

Before considering the application production-ready:

### Document Processing
- [ ] PDF parsing works for all documents
- [ ] Chunking produces appropriate segments
- [ ] Metadata is correctly extracted
- [ ] All documents successfully ingested

### Vector Storage
- [ ] Database connection stable
- [ ] Embeddings generated correctly
- [ ] Vector search returns relevant results
- [ ] Metadata filtering works

### Agent & Memory
- [ ] Agent responds accurately
- [ ] Sources are cited correctly
- [ ] Memory persists across turns
- [ ] Tools are called appropriately

### User Experience
- [ ] UI loads without errors
- [ ] Streaming works smoothly
- [ ] Error states handled gracefully
- [ ] Mobile responsive

### Performance
- [ ] Response time < 10 seconds
- [ ] Handles concurrent users
- [ ] No memory leaks
- [ ] Database queries optimized

### Security
- [ ] API keys not exposed
- [ ] Input validation works
- [ ] Rate limiting functional
- [ ] CORS properly configured

## Troubleshooting Failed Tests

### Document Ingestion Fails

**Check**:
- PDF files are valid
- PostgreSQL running
- Environment variables set
- Sufficient disk space

**Debug**:
```bash
npm run ingest 2>&1 | tee debug.log
```

### Vector Search Returns Irrelevant Results

**Check**:
- Chunk size too large/small
- Wrong embedding model
- Query phrasing
- topK value

**Adjust**:
- Modify chunking parameters
- Test different queries
- Check embedding model consistency

### Agent Doesn't Use Tools

**Check**:
- Tools properly registered
- Tool descriptions clear
- Agent instructions mention tools
- Mastra Studio traces

**Debug**:
- View traces in Studio
- Check tool call logs
- Verify tool configuration

### Memory Doesn't Persist

**Check**:
- Thread ID consistent
- Resource ID set correctly
- Memory configuration
- Storage adapter working

**Test**:
```bash
# Check memory tables
psql $POSTGRES_CONNECTION_STRING -c "
SELECT * FROM threads LIMIT 5;
SELECT * FROM messages LIMIT 5;
"
```

## Performance Optimization Tests

After optimizations, re-run benchmarks:

```bash
# Before optimization
npm run benchmark:before

# After optimization
npm run benchmark:after

# Compare results
diff benchmark-before.log benchmark-after.log
```

## Regression Testing

When making changes, run full test suite:

```bash
npm run test:all
```

Ensure:
- All existing tests pass
- No performance degradation
- New features have tests
- Documentation updated

## Test Reporting

Generate test reports:

```bash
npm run test:report
```

Include in documentation:
- Test coverage percentage
- Failed test details
- Performance metrics
- Known issues

## Continuous Integration

Set up CI/CD pipeline (GitHub Actions example):

```yaml
name: Test

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: ankane/pgvector
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test
    
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
        env:
          POSTGRES_CONNECTION_STRING: postgresql://postgres:postgres@localhost:5432/test
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Conclusion

Thorough testing ensures:
- Reliable RAG system
- Accurate responses
- Good user experience
- Production readiness

Run tests regularly and before each deployment.

# Deployment Guide

This guide covers deploying the Berkshire Hathaway Intelligence RAG application to production.

## Prerequisites

- Completed application setup from README.md
- Production PostgreSQL database with pgvector
- Valid OpenAI API key
- Vercel account (recommended) or alternative hosting

## Option 1: Vercel Deployment (Recommended)

### 1. Prepare the Application

Ensure your `next.config.js` is configured:

```javascript
const nextConfig = {
  serverExternalPackages: ['@mastra/*'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
```

### 2. Set Up Production Database

#### Using Neon (Recommended)

1. Sign up at https://neon.tech
2. Create a new project
3. The pgvector extension is enabled by default
4. Copy the connection string

#### Using Supabase

1. Sign up at https://supabase.com
2. Create a new project
3. Go to SQL Editor and run:
   ```sql
   CREATE EXTENSION vector;
   ```
4. Copy the connection string from Settings → Database

### 3. Deploy to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login

# Deploy
vercel
```

### 4. Configure Environment Variables

In the Vercel dashboard:

1. Go to Settings → Environment Variables
2. Add the following:
   - `OPENAI_API_KEY`: Your OpenAI API key
   - `POSTGRES_CONNECTION_STRING`: Production database URL
   - `MASTRA_PORT`: 4111 (optional)
   - `MASTRA_HOST`: 0.0.0.0 (optional)

### 5. Ingest Documents in Production

After deployment, you need to ingest documents. Two options:

#### Option A: Local Ingestion to Production DB

```bash
# Use production connection string locally
POSTGRES_CONNECTION_STRING="your_production_db_url" npm run ingest
```

#### Option B: Run Ingestion Script on Vercel

Create a serverless function at `app/api/admin/ingest/route.ts`:

```typescript
import { processPDFDocuments } from '@/scripts/ingest-documents';
import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const expectedToken = process.env.ADMIN_TOKEN;
  
  if (!expectedToken || authHeader !== `Bearer ${expectedToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await processPDFDocuments();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
```

Then call it:

```bash
curl -X POST https://your-app.vercel.app/api/admin/ingest \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Option 2: Docker Deployment

### 1. Create Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000 4111

CMD ["npm", "start"]
```

### 2. Create docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "4111:4111"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - POSTGRES_CONNECTION_STRING=postgresql://postgres:postgres@db:5432/berkshire_rag
    depends_on:
      - db

  db:
    image: ankane/pgvector:latest
    environment:
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=berkshire_rag
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

volumes:
  postgres_data:
```

### 3. Deploy

```bash
docker-compose up -d

# Run ingestion
docker-compose exec app npm run ingest
```

## Option 3: AWS Deployment

### 1. Set Up Infrastructure

#### RDS PostgreSQL

```bash
# Create RDS instance with PostgreSQL 14+
aws rds create-db-instance \
  --db-instance-identifier berkshire-rag-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 14.7 \
  --master-username admin \
  --master-user-password YourPassword \
  --allocated-storage 20

# Install pgvector extension (connect via psql)
psql -h your-rds-endpoint.rds.amazonaws.com -U admin -d postgres
CREATE EXTENSION vector;
```

#### Elastic Beanstalk

```bash
# Initialize EB application
eb init -p node.js berkshire-rag

# Create environment
eb create production

# Set environment variables
eb setenv OPENAI_API_KEY=your_key \
  POSTGRES_CONNECTION_STRING=your_rds_url

# Deploy
eb deploy
```

## Option 4: Railway Deployment

### 1. Install Railway CLI

```bash
npm install -g @railway/cli
```

### 2. Initialize Project

```bash
railway login
railway init
```

### 3. Add PostgreSQL

```bash
railway add postgresql
```

### 4. Deploy

```bash
railway up
```

### 5. Configure Variables

In Railway dashboard, add:
- `OPENAI_API_KEY`
- Railway automatically provides `POSTGRES_CONNECTION_STRING`

## Post-Deployment Checklist

### 1. Verify Database Connection

```bash
curl https://your-app-url.com/api/health
```

### 2. Test RAG System

```bash
curl -X POST https://your-app-url.com/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What is Warren Buffett'\''s investment philosophy?"}],
    "threadId": "test-1"
  }'
```

### 3. Monitor Performance

- Check response times
- Monitor database query performance
- Track OpenAI API usage
- Set up error logging (Sentry, LogRocket, etc.)

### 4. Set Up Monitoring

#### Vercel Analytics

Enable in Vercel dashboard under Analytics tab.

#### Custom Logging

Add to `app/api/chat/route.ts`:

```typescript
import * as Sentry from '@sentry/nextjs';

try {
  // ... chat logic
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

## Production Optimizations

### 1. Add Response Caching

```typescript
import { unstable_cache } from 'next/cache';

const getCachedResponse = unstable_cache(
  async (query: string) => {
    return await agent.generate(query);
  },
  ['chat-response'],
  { revalidate: 3600 }
);
```

### 2. Implement Rate Limiting

```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
});

export async function POST(req: NextRequest) {
  const ip = req.ip ?? 'anonymous';
  const { success } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }
  
  // ... rest of handler
}
```

### 3. Add Health Check Endpoint

Create `app/api/health/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { mastra } from '@/mastra';

export async function GET() {
  try {
    const vectorStore = mastra.getVector('pgVector');
    const stats = await vectorStore.describeIndex('berkshire_letters');
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      vectorStore: {
        documents: stats.count,
        dimension: stats.dimension,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: error.message,
      },
      { status: 500 }
    );
  }
}
```

### 4. Enable Compression

In `next.config.js`:

```javascript
const nextConfig = {
  // ... existing config
  compress: true,
};
```

## Security Best Practices

### 1. API Key Protection

Never expose API keys in client-side code. All OpenAI calls should go through backend routes.

### 2. Input Validation

Add validation in API routes:

```typescript
import { z } from 'zod';

const messageSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().max(4000),
    })
  ).max(20),
  threadId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const validated = messageSchema.parse(body);
  // ... rest of handler
}
```

### 3. CORS Configuration

For API-only deployments:

```typescript
export async function POST(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
  
  if (!allowedOrigins.includes(origin)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  
  // ... rest of handler
}
```

## Scaling Considerations

### Database

- Use connection pooling (PgBouncer)
- Add read replicas for high traffic
- Monitor query performance and add indexes

### Compute

- Scale horizontally with multiple instances
- Use serverless functions for variable load
- Implement background job processing for heavy tasks

### Caching

- Add Redis for response caching
- Cache embeddings for common queries
- Use CDN for static assets

## Troubleshooting

### Deployment Fails

```bash
# Check build logs
vercel logs

# Test build locally
npm run build
npm start
```

### Database Connection Issues

```bash
# Test connection
psql "$POSTGRES_CONNECTION_STRING"

# Check firewall rules
# Ensure your deployment IP is whitelisted
```

### High Latency

- Check database query times
- Monitor OpenAI API latency
- Implement caching
- Optimize chunk size and retrieval count

## Rollback Procedure

If deployment has issues:

```bash
# Vercel
vercel rollback

# Elastic Beanstalk
eb deploy --version previous-version

# Railway
railway rollback
```

## Backup Strategy

### Database Backups

```bash
# Automated backups (most managed services include this)
# Manual backup
pg_dump "$POSTGRES_CONNECTION_STRING" > backup.sql

# Restore
psql "$POSTGRES_CONNECTION_STRING" < backup.sql
```

### Document Backups

Keep original PDF files in version control or cloud storage.

## Monitoring & Alerts

Set up alerts for:
- High error rates (>1%)
- Slow response times (>5s)
- Database connection failures
- High OpenAI API costs

Recommended tools:
- Vercel Analytics
- Sentry for error tracking
- Datadog or New Relic for APM
- PostgreSQL slow query log

## Cost Optimization

- Cache frequent queries
- Use smaller embedding models where appropriate
- Implement query deduplication
- Monitor OpenAI token usage
- Use reserved instances for databases
- Implement request batching

## Support

For deployment issues:
1. Check application logs
2. Verify environment variables
3. Test database connectivity
4. Review this deployment guide
5. Consult platform-specific documentation

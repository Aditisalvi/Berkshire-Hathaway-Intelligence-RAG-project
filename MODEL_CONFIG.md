# Multi-Model Configuration Guide

This application supports both OpenAI and Google Gemini models for LLM and embeddings.

## Supported Models

### OpenAI
- **LLM**: GPT-4o
- **Embeddings**: text-embedding-3-small (1536 dimensions)

### Google Gemini
- **LLM**: Gemini 2.0 Flash (experimental)
- **Embeddings**: text-embedding-004 (768 dimensions)

## Configuration

### 1. Get API Keys

**OpenAI**:
1. Visit https://platform.openai.com/api-keys
2. Create a new API key
3. Copy the key (starts with `sk-`)

**Google AI (Gemini)**:
1. Visit https://aistudio.google.com/app/apikey
2. Create a new API key
3. Copy the key

### 2. Set Environment Variables

Edit your `.env` file:

```env
# API Keys
OPENAI_API_KEY=sk-your-openai-key
GOOGLE_GENERATIVE_AI_API_KEY=your-google-key

# Model Selection
LLM_PROVIDER=openai        # or 'gemini'
EMBEDDING_PROVIDER=openai  # or 'gemini'
```

### 3. Configuration Options

You can mix and match providers:

**Option 1: All OpenAI (Default)**
```env
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=openai
```
- Best for: Production, proven reliability
- Cost: Higher (GPT-4o is premium)
- Quality: Excellent

**Option 2: All Gemini**
```env
LLM_PROVIDER=gemini
EMBEDDING_PROVIDER=gemini
```
- Best for: Cost optimization, experimentation
- Cost: Lower (Gemini has free tier)
- Quality: Very good, competitive

**Option 3: Mixed (OpenAI LLM + Gemini Embeddings)**
```env
LLM_PROVIDER=openai
EMBEDDING_PROVIDER=gemini
```
- Best for: Cost optimization on embeddings
- Cost: Moderate (save on embedding costs)
- Quality: Excellent LLM with good embeddings

**Option 4: Mixed (Gemini LLM + OpenAI Embeddings)**
```env
LLM_PROVIDER=gemini
EMBEDDING_PROVIDER=openai
```
- Best for: Testing Gemini while keeping proven embeddings
- Cost: Lower LLM costs
- Quality: Good balance

## Important Notes

### Embedding Dimensions

Different embedding models use different dimensions:
- **OpenAI text-embedding-3-small**: 1536 dimensions
- **Gemini text-embedding-004**: 768 dimensions

**⚠️ IMPORTANT**: If you switch embedding providers, you must re-ingest your documents!

### Switching Embedding Providers

1. Update `.env` file with new `EMBEDDING_PROVIDER`
2. Drop and recreate the database index:
   ```bash
   psql $POSTGRES_CONNECTION_STRING -c "DROP TABLE IF EXISTS vectors CASCADE;"
   ```
3. Re-run ingestion:
   ```bash
   npm run ingest
   ```

### Switching LLM Providers

You can switch LLM providers without re-ingesting:
1. Update `.env` file with new `LLM_PROVIDER`
2. Restart the application:
   ```bash
   npm run dev
   ```

## Performance Comparison

### Response Quality
- **OpenAI GPT-4o**: Excellent, very detailed responses
- **Gemini 2.0 Flash**: Very good, fast and efficient

### Speed
- **OpenAI GPT-4o**: ~2-3 seconds first token
- **Gemini 2.0 Flash**: ~1-2 seconds first token (faster)

### Cost (Approximate)
- **OpenAI GPT-4o**: $0.015/1K tokens (input), $0.06/1K tokens (output)
- **Gemini 2.0 Flash**: Free tier available, then much lower costs

### Embedding Quality
- **OpenAI text-embedding-3-small**: Excellent retrieval quality
- **Gemini text-embedding-004**: Very good, competitive quality

## Testing Different Configurations

### Test Script

Create `test-models.sh`:

```bash
#!/bin/bash

echo "Testing OpenAI Configuration..."
LLM_PROVIDER=openai EMBEDDING_PROVIDER=openai npm run dev &
sleep 5
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is value investing?"}]}'
killall node

echo "\nTesting Gemini Configuration..."
LLM_PROVIDER=gemini EMBEDDING_PROVIDER=gemini npm run dev &
sleep 5
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is value investing?"}]}'
killall node
```

## Recommendations

### For Development
- Use Gemini (free tier, fast iteration)
- Mixed configuration for testing

### For Production
- Use OpenAI for critical applications (proven track record)
- Consider Gemini for cost-sensitive deployments
- Test both thoroughly before deciding

### For Cost Optimization
- Gemini embeddings with OpenAI LLM
- Reduces embedding costs significantly
- Maintains high-quality responses

## Troubleshooting

### "API key not found" Error

**Check**:
1. Is the API key in `.env`?
2. Is the key valid?
3. Did you restart the application?

**Test OpenAI key**:
```bash
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Test Gemini key**:
```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=$GOOGLE_GENERATIVE_AI_API_KEY"
```

### "Dimension mismatch" Error

You switched embedding providers without re-ingesting:
1. Clear the database
2. Re-run ingestion with new provider
3. Restart application

### "Model not found" Error

Check that the model name is correct in `src/lib/model-config.ts`:
- Gemini: `gemini-2.0-flash-exp` and `text-embedding-004`
- OpenAI: `gpt-4o` and `text-embedding-3-small`

## Migration Guide

### From OpenAI to Gemini

1. Get Gemini API key
2. Add to `.env`:
   ```env
   GOOGLE_GENERATIVE_AI_API_KEY=your-key
   ```
3. Update providers:
   ```env
   LLM_PROVIDER=gemini
   EMBEDDING_PROVIDER=gemini
   ```
4. Re-ingest documents (for embedding change):
   ```bash
   npm run ingest
   ```
5. Restart application

### From Gemini to OpenAI

Same process, but:
1. Get OpenAI API key
2. Update providers to `openai`
3. Re-ingest if you changed embeddings

## Advanced Configuration

### Custom Models

Edit `src/lib/model-config.ts` to add custom models:

```typescript
export function getLLMModel() {
  const config = getModelConfig();
  
  switch (config.llmProvider) {
    case 'gemini':
      return google('gemini-1.5-pro'); // Use different Gemini model
    case 'openai':
    default:
      return openai('gpt-4-turbo'); // Use different OpenAI model
  }
}
```

### Environment-Specific Configuration

Use different `.env` files:

```bash
# Development
cp .env.development .env

# Production
cp .env.production .env
```

## Cost Tracking

### Monitor OpenAI Usage
https://platform.openai.com/usage

### Monitor Gemini Usage
https://aistudio.google.com/app/apikey

## Support

For issues:
1. Verify API keys are valid
2. Check model names in configuration
3. Ensure proper embedding dimension matching
4. Review Mastra documentation for model integration

## Model Comparison Matrix

| Feature | OpenAI GPT-4o | Gemini 2.0 Flash |
|---------|---------------|------------------|
| Quality | Excellent | Very Good |
| Speed | Good | Fast |
| Cost | High | Low |
| Context | 128K tokens | 1M tokens |
| Free Tier | No | Yes |
| Best For | Production | Development |

## Conclusion

Both OpenAI and Gemini are excellent choices. OpenAI provides proven reliability for production, while Gemini offers great performance at lower cost. Test both and choose based on your needs!

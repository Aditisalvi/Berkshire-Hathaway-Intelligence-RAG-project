import { openai } from '@ai-sdk/openai';

export function getLLMModel() {
  return openai('gpt-4o-2024-08-06');
}

export function getEmbeddingModel() {
  return openai.embedding('text-embedding-3-small');
}

export function getEmbeddingDimension(): number {
  // OpenAI text-embedding-3-small uses 1536 dimensions
  return 1536;
}
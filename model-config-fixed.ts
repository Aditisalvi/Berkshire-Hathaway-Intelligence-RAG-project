import { openai } from '@ai-sdk/openai';
import { google } from '@ai-sdk/google';

export type LLMProvider = 'openai' | 'gemini';
export type EmbeddingProvider = 'openai' | 'gemini';

export interface ModelConfig {
  llmProvider: LLMProvider;
  embeddingProvider: EmbeddingProvider;
}

export function getModelConfig(): ModelConfig {
  const llmProvider = (process.env.LLM_PROVIDER || 'openai') as LLMProvider;
  const embeddingProvider = (process.env.EMBEDDING_PROVIDER || 'openai') as EmbeddingProvider;

  return {
    llmProvider,
    embeddingProvider,
  };
}

export function getLLMModel() {
  const config = getModelConfig();
  
  switch (config.llmProvider) {
    case 'gemini':
      return google('gemini-1.5-flash-latest');
    case 'openai':
    default:
      return openai('gpt-4o');
  }
}

export function getEmbeddingModel() {
  const config = getModelConfig();
  
  switch (config.embeddingProvider) {
    case 'gemini':
      return google.textEmbeddingModel('text-embedding-004');
    case 'openai':
    default:
      return openai.embedding('text-embedding-3-small');
  }
}

export function getModelDisplayName(): string {
  const config = getModelConfig();
  
  const llmName = config.llmProvider === 'gemini' ? 'Gemini 2.0 Flash' : 'GPT-4o';
  const embeddingName = config.embeddingProvider === 'gemini' ? 'Gemini Text Embedding' : 'OpenAI Text Embedding';
  
  return `LLM: ${llmName} | Embeddings: ${embeddingName}`;
}

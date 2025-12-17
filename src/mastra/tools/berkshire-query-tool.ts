import { createVectorQueryTool } from '@mastra/rag';
import { getEmbeddingModel } from '../../lib/model-config';

export const berkshireQueryTool = createVectorQueryTool({
  vectorStoreName: 'pgVector',
  indexName: 'berkshire_letters',
  description: `Query the Berkshire Hathaway shareholder letters knowledge base. 
    Use this tool to search for information about Warren Buffett's investment philosophy,
    Berkshire's business strategies, acquisitions, market views, and company performance.
    Provide specific, targeted queries to get the most relevant information.`,
  model: getEmbeddingModel(),
  topK: 5,
  metadata: {
    includeMetadata: true,
  },
});

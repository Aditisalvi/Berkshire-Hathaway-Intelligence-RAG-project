import { createVectorQueryTool } from '@mastra/rag';
import { getEmbeddingModel } from '../../lib/model-config';

export const berkshireQueryTool = createVectorQueryTool({
  vectorStoreName: 'pgVector',
  indexName: 'berkshire_letters',
  description: `Query the Berkshire Hathaway shareholder letters knowledge base. 
    Use this tool to search for information about Warren Buffett's investment philosophy,
    Berkshire's business strategies, acquisitions, market views, and company performance.
    
    The tool performs semantic search across all shareholder letters and returns relevant passages
    with metadata including the year and source letter.`,
  model: getEmbeddingModel(),
});
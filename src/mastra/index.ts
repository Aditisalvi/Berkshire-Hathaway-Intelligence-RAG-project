import { Mastra } from '@mastra/core/mastra';
import { PgVector } from '@mastra/pg';
import { berkshireAgent } from './agents/berkshire-agent';

const pgVector = new PgVector({
  connectionString: process.env.POSTGRES_CONNECTION_STRING!,
});

export const mastra = new Mastra({
  agents: {
    'berkshire-agent': berkshireAgent,
  },
  vectors: {
    pgVector,
  },
  server: {
    port: parseInt(process.env.MASTRA_PORT || '4111'),
    host: process.env.MASTRA_HOST || 'localhost',
  },
});
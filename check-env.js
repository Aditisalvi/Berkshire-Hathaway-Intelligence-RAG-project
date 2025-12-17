// Check environment variables
console.log('Checking environment variables...\n');

const requiredVars = [
  'POSTGRES_CONNECTION_STRING',
  'GOOGLE_GENERATIVE_AI_API_KEY',
  'LLM_PROVIDER',
  'EMBEDDING_PROVIDER'
];

let allPresent = true;

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(`✓ ${varName}: ${varName.includes('KEY') ? '[HIDDEN]' : value}`);
  } else {
    console.log(`✗ ${varName}: NOT SET`);
    allPresent = false;
  }
});

console.log('\n' + (allPresent ? 'All required variables are set!' : 'Some variables are missing!'));

if (!allPresent) {
  console.log('\nMake sure your .env file exists and contains:');
  console.log('POSTGRES_CONNECTION_STRING=postgresql://user:password@localhost:5432/berkshire_rag');
  console.log('GOOGLE_GENERATIVE_AI_API_KEY=your-key-here');
  console.log('LLM_PROVIDER=gemini');
  console.log('EMBEDDING_PROVIDER=gemini');
}

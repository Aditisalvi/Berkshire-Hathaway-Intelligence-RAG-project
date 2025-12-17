// Test Gemini API directly
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import * as dotenv from 'dotenv';

dotenv.config();

async function testGemini() {
  console.log('Testing Gemini API...\n');
  
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    console.error('❌ GOOGLE_GENERATIVE_AI_API_KEY not set!');
    process.exit(1);
  }
  
  console.log('✓ API key is set');
  console.log('✓ Testing model: gemini-1.5-flash-latest\n');
  
  try {
    const { text } = await generateText({
      model: google('gemini-2.5-flash'),
      prompt: 'Say "Hello from Gemini!" and nothing else.',
    });
    
    console.log('✅ SUCCESS! Gemini responded:');
    console.log(text);
    console.log('\nGemini API is working correctly!');
    
  } catch (error) {
    console.error('❌ FAILED! Error:');
    console.error(error);
    
    if (error instanceof Error) {
      console.error('\nError message:', error.message);
      if (error.message.includes('API key')) {
        console.error('\n💡 Your API key might be invalid or expired.');
        console.error('Get a new key at: https://aistudio.google.com/app/apikey');
      }
    }
  }
}

testGemini();

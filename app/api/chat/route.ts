import { mastra } from '@/mastra';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

const agentInstructions = `You are a knowledgeable financial analyst specializing in Warren Buffett's investment philosophy and Berkshire Hathaway's business strategy. Your expertise comes from analyzing years of Berkshire Hathaway annual shareholder letters.

Core Responsibilities:
- Answer questions about Warren Buffett's investment principles and philosophy
- Provide insights into Berkshire Hathaway's business strategies and decisions
- Reference specific examples from the shareholder letters when appropriate
- Maintain context across conversations for follow-up questions

Guidelines:
- Always ground your responses in the provided shareholder letter content
- Quote directly from the letters when relevant, with proper citations including the year
- If information isn't available in the documents, clearly state this limitation
- Provide year-specific context when discussing how views or strategies evolved
- For numerical data or specific acquisitions, cite the exact source letter and year
- Explain complex financial concepts in accessible terms while maintaining accuracy

Response Format:
- Provide comprehensive, well-structured answers
- Include relevant quotes from the letters with year attribution
- List source documents used for your response
- For follow-up questions, reference previous conversation context appropriately

Remember: Your authority comes from the shareholder letters. Stay grounded in this source material and be transparent about the scope and limitations of your knowledge.`;

export async function POST(req: NextRequest) {
  try {
    const { messages, threadId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    console.log('Getting agent...');
    const agent = mastra.getAgent('berkshire-agent');
    
    if (!agent) {
      console.error('Agent not found');
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 500 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    console.log('Setting up streaming with RAG...');
    
    try {
      // Import necessary modules
      const { google } = await import('@ai-sdk/google');
      const { streamText } = await import('ai');
      const { PgVector } = await import('@mastra/pg');
      const { embed } = await import('ai');
      
      // Step 1: Search the vector database for relevant context
      const pgVector = new PgVector({
        connectionString: process.env.POSTGRES_CONNECTION_STRING!,
      });
      
      // Generate embedding for the user's question
      const { embedding } = await embed({
        model: google.textEmbeddingModel('text-embedding-004'),
        value: lastMessage.content,
      });
      
      // Search for relevant chunks
      const searchResults = await pgVector.query({
        indexName: 'berkshire_letters',
        queryVector: embedding,
        topK: 5,
      });
      
      console.log(`Found ${searchResults.length} relevant chunks`);
      
      // Extract context from search results
      const context = searchResults
        .map((result, idx) => {
          const metadata = result.metadata as any;
          return `[Source ${idx + 1}: ${metadata.year} - ${metadata.title}]\n${metadata.text}`;
        })
        .join('\n\n---\n\n');
      
      // Step 2: Create the prompt with context
      const userPrompt = `${agentInstructions}

Context from shareholder letters:
${context}

User Question: ${lastMessage.content}

Instructions:
- Answer based ONLY on the provided context
- Quote specific passages and cite the year inline (e.g., "as stated in the 2024 letter")
- Be comprehensive and detailed
- Do NOT add a sources list at the end - it will be added automatically`;

      console.log('Starting stream...');
      
      // Step 3: Stream the response
      const result = await streamText({
        model: google('gemini-2.5-flash'),
        prompt: userPrompt,
      });
      
      // Create streaming response
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        async start(controller) {
          try {
            // Stream the AI response
            for await (const chunk of result.textStream) {
              // Properly escape the text for JSON
              const escapedText = JSON.stringify(chunk);
              controller.enqueue(encoder.encode(`0:${escapedText}\n`));
            }
            
            controller.close();
          } catch (error) {
            console.error('Stream error:', error);
            controller.error(error);
          }
        },
      });

      return new NextResponse(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
      
    } catch (streamError) {
      console.error('Streaming error:', streamError);
      return NextResponse.json(
        { 
          error: 'Streaming failed',
          message: streamError instanceof Error ? streamError.message : String(streamError),
        },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { 
        error: 'An error occurred processing your request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
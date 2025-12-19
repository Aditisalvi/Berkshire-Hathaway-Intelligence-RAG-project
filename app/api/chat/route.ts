import { mastra } from '@/mastra';
import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { addMessage } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    // Verify authentication
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Parse request body
    const { messages, conversationId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const lastMessage = messages[messages.length - 1];
    
    if (!lastMessage || lastMessage.role !== 'user') {
      return NextResponse.json(
        { error: 'Last message must be from user' },
        { status: 400 }
      );
    }

    // Get the agent
    const agent = mastra.getAgent('berkshire-agent');
    
    if (!agent) {
      console.error('Agent not found');
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 500 }
      );
    }

    // Save user message to database
    if (conversationId) {
      await addMessage(conversationId, 'user', lastMessage.content);
    }

    // Prepare conversation context
    const conversationHistory = messages
      .slice(0, -1)
      .map((msg: ChatMessage) => `${msg.role.toUpperCase()}: ${msg.content}`)
      .join('\n\n');

    const prompt = conversationHistory 
      ? `Previous conversation:\n${conversationHistory}\n\nCurrent question: ${lastMessage.content}`
      : lastMessage.content;

    // Stream response from agent
    const result = await agent.streamLegacy(prompt);

    let fullResponse = '';
    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            fullResponse += chunk;
            
            const escapedText = JSON.stringify(chunk);
            controller.enqueue(encoder.encode(`0:${escapedText}\n`));
          }

          // Save assistant response to database
          if (conversationId && fullResponse) {
            await addMessage(conversationId, 'assistant', fullResponse);
          }

          controller.close();
        } catch (streamError) {
          console.error('Stream error:', streamError);
          controller.error(streamError);
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

  } catch (error) {
    console.error('Chat error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to process request',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
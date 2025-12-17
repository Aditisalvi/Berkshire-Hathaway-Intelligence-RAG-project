import { mastra } from '@/mastra';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function POST(req: NextRequest) {
  try {
    const { messages, threadId } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    const agent = mastra.getAgent('berkshireAgent');
    
    if (!agent) {
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

    const resourceId = 'default-user';
    const thread = threadId || `thread-${Date.now()}`;

    // Use streamLegacy() for AI SDK v4 compatibility with Gemini
    const result = await agent.streamLegacy(lastMessage.content);

    return result.toDataStreamResponse();

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

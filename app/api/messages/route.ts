import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import {
  getConversationMessages,
  userOwnsConversation,
  addMessage,
} from '@/lib/db';

// Get all messages for a conversation
export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const conversationId = parseInt(searchParams.get('id') || '');

    if (!conversationId) {
      return NextResponse.json(
        { error: 'Conversation ID required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const owns = await userOwnsConversation(payload.userId, conversationId);
    if (!owns) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const messages = await getConversationMessages(conversationId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// Save a new message
export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { conversationId, role, content } = await req.json();

    if (!conversationId || !role || !content) {
      return NextResponse.json(
        { error: 'conversationId, role, and content are required' },
        { status: 400 }
      );
    }

    // Verify ownership
    const owns = await userOwnsConversation(payload.userId, conversationId);
    if (!owns) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const message = await addMessage(conversationId, role, content);
    return NextResponse.json({ message });
  } catch (error) {
    console.error('Save message error:', error);
    return NextResponse.json(
      { error: 'Failed to save message' },
      { status: 500 }
    );
  }
}
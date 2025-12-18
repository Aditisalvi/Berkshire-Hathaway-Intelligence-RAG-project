'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ConversationSidebar from '../components/ConversationSidebar';
import CitationParser from '../components/CitationParser';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger sidebar refresh
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/auth');
      return;
    }
    setIsAuthenticated(true);
  }, [router]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const createNewConversation = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/conversations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title: 'New Conversation' }),
      });

      if (response.ok) {
        const data = await response.json();
        setRefreshTrigger(prev => prev + 1); // Trigger sidebar refresh
        return data.conversation.id;
      }
    } catch (error) {
      console.error('Failed to create conversation:', error);
    }
    return null;
  };

  const saveMessage = async (
    convId: number,
    role: 'user' | 'assistant',
    content: string
  ) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: convId,
          role,
          content,
        }),
      });
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  const updateConversationTitle = async (convId: number, firstMessage: string) => {
    try {
      const token = localStorage.getItem('token');
      const title = firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '');
      
      await fetch('/api/conversations', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: convId,
          title,
        }),
      });
      
      setRefreshTrigger(prev => prev + 1); // Trigger sidebar refresh
    } catch (error) {
      console.error('Failed to update title:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Create conversation if new
      let convId = conversationId;
      if (!convId) {
        convId = await createNewConversation();
        if (convId) {
          setConversationId(convId);
          // Update title with first message
          await updateConversationTitle(convId, userMessage.content);
        }
      }

      // Save user message
      if (convId) {
        await saveMessage(convId, 'user', userMessage.content);
      }

      // Call chat API
      const token = localStorage.getItem('token');
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          conversationId: convId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create empty assistant message
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '',
        },
      ]);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter((line) => line.trim());

          for (const line of lines) {
            if (line.startsWith('0:')) {
              try {
                const jsonStr = line.slice(2);
                let text = '';
                try {
                  text = JSON.parse(jsonStr);
                } catch {
                  const match = jsonStr.match(/^"(.*)"$/s);
                  if (match) {
                    text = match[1]
                      .replace(/\\n/g, '\n')
                      .replace(/\\"/g, '"')
                      .replace(/\\\\/g, '\\');
                  } else {
                    text = jsonStr;
                  }
                }

                accumulatedContent += text;

                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];

                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = accumulatedContent;
                  }

                  return newMessages;
                });
              } catch (e) {
                console.error('Failed to parse chunk:', e);
              }
            }
          }
        }
      }

      // Save assistant message
      if (convId && accumulatedContent) {
        await saveMessage(convId, 'assistant', accumulatedContent);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, an error occurred. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setInput('');
  };

  const handleSelectConversation = async (id: number) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/messages?id=${id}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMessages(data.messages);
        setConversationId(id);
      }
    } catch (error) {
      console.error('Failed to load conversation:', error);
    }
  };

  const handleDeleteConversation = (id: number) => {
    if (id === conversationId) {
      handleNewConversation();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  if (!isAuthenticated) {
    return <div>Loading...</div>;
  }

  return (
    <div className="chat-layout">
      <ConversationSidebar
        currentConversationId={conversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        refreshTrigger={refreshTrigger}
      />

      <div className="chat-main">
        <div className="chat-header">
          <h1>Berkshire Hathaway Intelligence</h1>
          <p>Ask questions about Warren Buffett's investment philosophy</p>
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="welcome-message">
              <h2>Welcome back!</h2>
              <p>
                Ask me anything about Warren Buffett's investment philosophy and
                Berkshire Hathaway's strategies.
              </p>
              <div className="example-queries">
                <h3>Try asking:</h3>
                <ul>
                  <li onClick={() => setInput("How has Berkshire's investment strategy evolved over the past 5 years?")}>
                    How has Berkshire's investment strategy evolved over the past 5 years?
                  </li>
                  <li onClick={() => setInput("How does Buffett think about diversification?")}>
                    How does Buffett think about diversification?
                  </li>
                  <li onClick={() => setInput("What characteristics does Buffett look for in business leaders?")}>
                    What characteristics does Buffett look for in business leaders?
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`message ${
                  message.role === 'user' ? 'message-user' : 'message-assistant'
                }`}
              >
                <div className="message-role">{message.role}</div>
                <div className="message-content">
                  {message.role === 'assistant' ? (
                    <CitationParser content={message.content} />
                  ) : (
                    <p>{message.content}</p>
                  )}
                </div>
              </div>
            ))
          )}

          {isLoading && (
            <div className="loading-indicator">
              <div className="loading-dots">
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
                <div className="loading-dot"></div>
              </div>
              <span>Analyzing shareholder letters...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="input-container">
          <form onSubmit={handleSubmit} className="input-form">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about Warren Buffett's investment philosophy..."
              className="input-field"
              disabled={isLoading}
              rows={2}
              style={{ resize: 'none' }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="submit-button"
            >
              {isLoading ? 'Sending...' : 'Send'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
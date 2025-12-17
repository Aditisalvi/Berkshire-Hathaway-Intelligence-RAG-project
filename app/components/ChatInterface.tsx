'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const EXAMPLE_QUESTIONS = [
  "What does Warren Buffett think about cryptocurrency?",
  "How has Berkshire's investment strategy evolved over the past 5 years?",
  "What is Buffett's view on market volatility and timing?",
  "How does Buffett evaluate management quality in potential investments?",
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [threadId] = useState(() => `thread-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleExampleClick = (question: string) => {
    setInput(question);
    inputRef.current?.focus();
  };

  const handleNewConversation = () => {
    if (confirm('Start a new conversation? Current chat history will be cleared.')) {
      setMessages([]);
      setInput('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading) {
      return;
    }

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          threadId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Create empty assistant message that we'll update as we stream
      setMessages(prev => [
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
          
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            // Parse Vercel AI SDK streaming format: 0:"text"
            if (line.startsWith('0:')) {
              try {
                // Extract text between quotes after "0:"
                const jsonStr = line.slice(2);
                
                // More robust parsing - handle escaped quotes and newlines
                let text = '';
                try {
                  // Try standard JSON parse first
                  text = JSON.parse(jsonStr);
                } catch {
                  // Fallback: manually extract text between first and last quote
                  const match = jsonStr.match(/^"(.*)"$/s);
                  if (match) {
                    // Unescape common escape sequences
                    text = match[1]
                      .replace(/\\n/g, '\n')
                      .replace(/\\"/g, '"')
                      .replace(/\\\\/g, '\\');
                  } else {
                    // If no quotes, just use the raw text
                    text = jsonStr;
                  }
                }
                
                accumulatedContent += text;
                
                // Update the last assistant message with accumulated content
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastMessage = newMessages[newMessages.length - 1];
                  
                  if (lastMessage && lastMessage.role === 'assistant') {
                    lastMessage.content = accumulatedContent;
                  }
                  
                  return newMessages;
                });
              } catch (e) {
                console.error('Failed to parse streaming chunk:', e, 'Line:', line);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, but I encountered an error processing your request. Please try again.',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="chat-container">
      <div className="chat-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Berkshire Hathaway Intelligence</h1>
            <p>Explore Warren Buffett's investment philosophy through decades of shareholder letters</p>
          </div>
          {messages.length > 0 && (
            <button 
              onClick={handleNewConversation}
              className="new-chat-button"
              title="Start a new conversation"
            >
              ➕ New Chat
            </button>
          )}
        </div>
        {messages.length > 0 && (
          <div className="conversation-info">
            💬 Conversation active • Context maintained across {Math.floor(messages.length / 2)} turns
          </div>
        )}
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="welcome-message">
            <h2>Welcome to Berkshire Hathaway Intelligence</h2>
            <p>
              I'm an AI assistant trained on Berkshire Hathaway's annual shareholder letters.
              Ask me anything about Warren Buffett's investment philosophy, business strategies,
              or insights from decades of shareholder communications.
            </p>
            <div className="example-queries">
              <h3>Try asking:</h3>
              <ul>
                {EXAMPLE_QUESTIONS.map((question, index) => (
                  <li
                    key={index}
                    onClick={() => handleExampleClick(question)}
                  >
                    {question}
                  </li>
                ))}
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
                  <ReactMarkdown>{message.content}</ReactMarkdown>
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
  );
}
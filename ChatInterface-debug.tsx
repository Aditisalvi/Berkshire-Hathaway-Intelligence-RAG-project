'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: string[];
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
      console.log('Sending message to API...');
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

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      if (reader) {
        // Add assistant message immediately
        setMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            content: '',
          },
        ]);

        while (true) {
          const { done, value } = await reader.read();
          
          if (done) {
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('Raw chunk:', chunk);
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            console.log('Processing line:', line);
            // Handle different data stream formats
            if (line.startsWith('0:')) {
              // Format: 0:"content"
              try {
                const jsonStr = line.slice(2);
                const content = JSON.parse(jsonStr);
                accumulatedContent += content;
              } catch {
                // If JSON parse fails, just append the raw content
                const content = line.slice(2).replace(/^"|"$/g, '');
                accumulatedContent += content;
              }
            } else if (line.startsWith('data: ')) {
              // Format: data: {"type":"text","value":"content"}
              try {
                const jsonStr = line.slice(6);
                const data = JSON.parse(jsonStr);
                if (data.type === 'text' && data.value) {
                  accumulatedContent += data.value;
                }
              } catch (e) {
                console.log('Could not parse line:', line);
              }
            } else if (line.trim() && !line.startsWith('event:')) {
              // Try to parse as JSON
              try {
                const data = JSON.parse(line);
                if (typeof data === 'string') {
                  accumulatedContent += data;
                } else if (data.text) {
                  accumulatedContent += data.text;
                } else if (data.content) {
                  accumulatedContent += data.content;
                }
              } catch {
                // Not JSON, might be plain text
                if (!line.startsWith('e:') && !line.startsWith('d:')) {
                  console.log('Unknown format:', line);
                }
              }
            }

            // Update the last assistant message
            setMessages(prev => {
              const newMessages = [...prev];
              const lastMessage = newMessages[newMessages.length - 1];

              if (lastMessage && lastMessage.role === 'assistant') {
                lastMessage.content = accumulatedContent;
              }

              return newMessages;
            });
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
        <h1>Berkshire Hathaway Intelligence</h1>
        <p>Explore Warren Buffett's investment philosophy through decades of shareholder letters</p>
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
              {message.sources && message.sources.length > 0 && (
                <div className="message-sources">
                  <div className="message-sources-title">Sources:</div>
                  {message.sources.map((source, idx) => (
                    <div key={idx} className="source-item">
                      {source}
                    </div>
                  ))}
                </div>
              )}
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

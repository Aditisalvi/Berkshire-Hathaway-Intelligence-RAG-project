'use client';

import { useState, useEffect } from 'react';

interface Conversation {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ConversationSidebarProps {
  currentConversationId: number | null;
  onSelectConversation: (id: number) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
  refreshTrigger?: number; 
}

export default function ConversationSidebar({
  currentConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  refreshTrigger,
}: ConversationSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState('');

  useEffect(() => {
    loadConversations();
    const user = localStorage.getItem('user');
    if (user) {
      setUsername(JSON.parse(user).username);
    }
  }, [currentConversationId, refreshTrigger]); 

  const loadConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/conversations', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setConversations(data.conversations);
      }
    } catch (error) {
      console.error('Failed to load conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Delete this conversation?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/conversations?id=${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setConversations(conversations.filter((c) => c.id !== id));
        onDeleteConversation(id);
      }
    } catch (error) {
      console.error('Failed to delete conversation:', error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-user">
          <div className="user-avatar">{username.charAt(0).toUpperCase()}</div>
          <span className="user-name">{username}</span>
        </div>
        <button onClick={handleLogout} className="logout-button" title="Logout">
          🚪
        </button>
      </div>

      <button onClick={onNewConversation} className="new-conversation-button">
        ➕ New Conversation
      </button>

      <div className="conversations-list">
        {loading ? (
          <div className="sidebar-loading">Loading...</div>
        ) : conversations.length === 0 ? (
          <div className="sidebar-empty">No conversations yet</div>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`conversation-item ${
                conv.id === currentConversationId ? 'active' : ''
              }`}
              onClick={() => onSelectConversation(conv.id)}
            >
              <div className="conversation-title">{conv.title}</div>
              <div className="conversation-meta">
                <span className="conversation-date">
                  {formatDate(conv.updated_at)}
                </span>
                <button
                  onClick={(e) => handleDelete(conv.id, e)}
                  className="delete-conversation"
                  title="Delete conversation"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="sidebar-footer">
        <div className="app-info">
          <p>Berkshire Hathaway Intelligence</p>
          <small>Powered by AI & RAG</small>
        </div>
      </div>
    </div>
  );
}
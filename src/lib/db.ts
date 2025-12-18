import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.POSTGRES_CONNECTION_STRING,
});

export interface User {
  id: number;
  username: string;
  password_hash: string;
  created_at: Date;
}

export interface Conversation {
  id: number;
  user_id: number;
  title: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Message {
  id: number;
  conversation_id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: Date;
}

/**
 * Create a new user
 */
export async function createUser(
  username: string,
  passwordHash: string
): Promise<User> {
  const result = await pool.query(
    'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING *',
    [username, passwordHash]
  );
  return result.rows[0];
}

/**
 * Find user by username
 */
export async function findUserByUsername(
  username: string
): Promise<User | null> {
  const result = await pool.query('SELECT * FROM users WHERE username = $1', [
    username,
  ]);
  return result.rows[0] || null;
}

/**
 * Find user by ID
 */
export async function findUserById(id: number): Promise<User | null> {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] || null;
}

/**
 * Create a new conversation
 */
export async function createConversation(
  userId: number,
  title?: string
): Promise<Conversation> {
  const result = await pool.query(
    'INSERT INTO conversations (user_id, title) VALUES ($1, $2) RETURNING *',
    [userId, title || 'New Conversation']
  );
  return result.rows[0];
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(
  userId: number
): Promise<Conversation[]> {
  const result = await pool.query(
    'SELECT * FROM conversations WHERE user_id = $1 ORDER BY updated_at DESC',
    [userId]
  );
  return result.rows;
}

/**
 * Get a specific conversation
 */
export async function getConversation(
  conversationId: number
): Promise<Conversation | null> {
  const result = await pool.query(
    'SELECT * FROM conversations WHERE id = $1',
    [conversationId]
  );
  return result.rows[0] || null;
}

/**
 * Update conversation title
 */
export async function updateConversationTitle(
  conversationId: number,
  title: string
): Promise<void> {
  await pool.query('UPDATE conversations SET title = $1 WHERE id = $2', [
    title,
    conversationId,
  ]);
}

/**
 * Delete a conversation
 */
export async function deleteConversation(
  conversationId: number
): Promise<void> {
  await pool.query('DELETE FROM conversations WHERE id = $1', [conversationId]);
}

/**
 * Add a message to a conversation
 */
export async function addMessage(
  conversationId: number,
  role: 'user' | 'assistant',
  content: string
): Promise<Message> {
  const result = await pool.query(
    'INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3) RETURNING *',
    [conversationId, role, content]
  );

  // Update conversation's updated_at
  await pool.query(
    'UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [conversationId]
  );

  return result.rows[0];
}

/**
 * Get all messages in a conversation
 */
export async function getConversationMessages(
  conversationId: number
): Promise<Message[]> {
  const result = await pool.query(
    'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
    [conversationId]
  );
  return result.rows;
}

/**
 * Check if user owns conversation
 */
export async function userOwnsConversation(
  userId: number,
  conversationId: number
): Promise<boolean> {
  const result = await pool.query(
    'SELECT id FROM conversations WHERE id = $1 AND user_id = $2',
    [conversationId, userId]
  );
  return result.rows.length > 0;
}
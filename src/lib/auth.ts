import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'secret-key-change-in-production';
const SALT_ROUNDS = 10;

export interface User {
  id: number;
  username: string;
}

export interface JWTPayload {
  userId: number;
  username: string;
}

/**
 * Hash a password
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
  };

  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: '7d', // Token expires in 7 days
  });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Validate username format
 */
export function validateUsername(username: string): {
  valid: boolean;
  error?: string;
} {
  if (!username || username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 50) {
    return { valid: false, error: 'Username must be less than 50 characters' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
    return {
      valid: false,
      error: 'Username can only contain letters, numbers, hyphens, and underscores',
    };
  }

  return { valid: true };
}

/**
 * Validate password format
 */
export function validatePassword(password: string): {
  valid: boolean;
  error?: string;
} {
  if (!password || password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }

  if (password.length > 100) {
    return { valid: false, error: 'Password must be less than 100 characters' };
  }

  return { valid: true };
}
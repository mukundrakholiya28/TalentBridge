import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_talentbridge_key';

export interface DecodedToken {
  userId: string;
  email: string;
  role: 'candidate' | 'recruiter';
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token from Authorization header
 * Returns decoded token or null if invalid
 */
export function verifyToken(request: NextRequest): DecodedToken | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    return decoded;
  } catch (err) {
    return null;
  }
}

/**
 * Get user from request or throw 401 error
 */
export function requireAuth(request: NextRequest): DecodedToken {
  const user = verifyToken(request);
  
  if (!user) {
    throw new Error('UNAUTHORIZED');
  }
  
  return user;
}

/**
 * Sign a JWT token
 */
export function signToken(payload: Omit<DecodedToken, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

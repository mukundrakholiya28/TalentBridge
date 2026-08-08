import jwt from 'jsonwebtoken';
import { NextRequest } from 'next/server';

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret_talentbridge_key';

export interface DecodedToken {
  id?: string;
  userId?: string;
  email?: string;
  userType?: 'candidate' | 'recruiter';
  role?: 'candidate' | 'recruiter';
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
 * Get userId from decoded token (handles both id and userId fields)
 */
export function getUserId(decoded: DecodedToken): string {
  return decoded.id || decoded.userId || '';
}

/**
 * Sign a JWT token
 */
export function signToken(payload: { userId?: string; id?: string; email?: string; role?: string; userType?: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

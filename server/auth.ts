import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { pg } from './db.js';

export interface AuthenticatedUser {
  id: number;
  username: string;
  email: string;
  role: string;
  is_email_verified: boolean;
  force_password_change: boolean;
  status: string;
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  sessionId?: string;
}

// Generate secure random token
export function generateToken(bytes = 32): string {
  return crypto.randomBytes(bytes).toString('hex');
}

// Check rate limit for login attempts
export async function checkLoginRateLimit(identifier: string): Promise<{ allowed: boolean; remainingAttempts: number; retryAfterSec?: number }> {
  const windowMinutes = 15;
  const maxAttempts = 6;

  // Cleanup old attempts
  await pg.query(`
    DELETE FROM login_attempts 
    WHERE attempt_time < CURRENT_TIMESTAMP - INTERVAL '${windowMinutes} minutes'
  `);

  const res = await pg.query(`
    SELECT COUNT(*) as failed_count 
    FROM login_attempts 
    WHERE identifier = $1 AND success = FALSE 
    AND attempt_time > CURRENT_TIMESTAMP - INTERVAL '${windowMinutes} minutes'
  `, [identifier]);

  const count = parseInt((res.rows[0] as any).failed_count || '0');
  if (count >= maxAttempts) {
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSec: 900 // 15 minutes
    };
  }

  return {
    allowed: true,
    remainingAttempts: maxAttempts - count
  };
}

export async function recordLoginAttempt(identifier: string, success: boolean) {
  if (success) {
    await pg.query(`DELETE FROM login_attempts WHERE identifier = $1`, [identifier]);
  } else {
    await pg.query(`
      INSERT INTO login_attempts (identifier, success) 
      VALUES ($1, $2)
    `, [identifier, success]);
  }
}

// Create a new session in DB
export async function createSession(userId: number, ip: string, userAgent: string): Promise<string> {
  const sessionId = generateToken(48);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await pg.query(`
    INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at)
    VALUES ($1, $2, $3, $4, $5)
  `, [sessionId, userId, ip, userAgent, expiresAt.toISOString()]);

  return sessionId;
}

// Revoke all sessions for a user (used after password change or admin revoke)
export async function revokeUserSessions(userId: number, exceptSessionId?: string) {
  if (exceptSessionId) {
    await pg.query(`
      UPDATE sessions SET is_revoked = TRUE 
      WHERE user_id = $1 AND id != $2
    `, [userId, exceptSessionId]);
  } else {
    await pg.query(`
      UPDATE sessions SET is_revoked = TRUE 
      WHERE user_id = $1
    `, [userId]);
  }
}

// Extract and verify session token from headers or cookie
export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (req.headers['x-session-token']) {
      token = req.headers['x-session-token'] as string;
    } else if (req.query?.token) {
      token = req.query.token as string;
    } else if (req.query?.sessionToken) {
      token = req.query.sessionToken as string;
    }

    if (!token) {
      return next(); // Unauthenticated visitor
    }

    const sessionRes = await pg.query(`
      SELECT s.id as session_id, s.is_revoked, s.expires_at,
             u.id, u.username, u.email, u.role, u.is_email_verified,
             u.force_password_change, u.status
      FROM sessions s
      JOIN users u ON s.user_id = u.id
      WHERE s.id = $1
    `, [token]);

    if (sessionRes.rows.length === 0) {
      return next();
    }

    const row = sessionRes.rows[0] as any;
    if (row.is_revoked || new Date(row.expires_at) < new Date()) {
      return next();
    }

    if (row.status === 'banned') {
      return res.status(403).json({ error: 'Your account has been banned due to violation of platform policies.' });
    }

    // Update last active
    await pg.query('UPDATE sessions SET last_active_at = CURRENT_TIMESTAMP WHERE id = $1', [token]);

    req.user = {
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role,
      is_email_verified: Boolean(row.is_email_verified),
      force_password_change: Boolean(row.force_password_change),
      status: row.status
    };
    req.sessionId = row.session_id;

    next();
  } catch (err) {
    console.error('[AuthMiddleware] Error:', err);
    next();
  }
}

// Guard for authenticated users
export function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Please log in.' });
  }
  next();
}

// Guard for Administrators only
export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required. Access denied.' });
  }
  if (req.user.role !== 'Administrator') {
    return res.status(403).json({ error: 'Forbidden: Administrator privileges required.' });
  }
  next();
}

// Log admin action to audit table
export async function logAdminAction(
  adminId: number | null,
  adminUsername: string,
  action: string,
  targetType: string,
  targetId: string | number,
  details: string,
  ip: string
) {
  try {
    await pg.query(`
      INSERT INTO admin_audit_logs (admin_id, admin_username, action, target_type, target_id, details, ip_address)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `, [adminId, adminUsername, action, targetType, String(targetId), details, ip]);
  } catch (err) {
    console.error('[AuditLog] Failed to record log:', err);
  }
}

// Check if user has active premium subscription
export async function checkUserSubscription(userId: number): Promise<{ isPremium: boolean; expiresAt?: string; planName?: string }> {
  try {
    const res = await pg.query(`
      SELECT s.id, s.status, s.expires_at, p.name as plan_name
      FROM subscriptions s
      LEFT JOIN membership_plans p ON s.plan_id = p.id
      WHERE s.user_id = $1 
      AND s.status IN ('active', 'complimentary')
      AND s.expires_at > CURRENT_TIMESTAMP
      ORDER BY s.expires_at DESC
      LIMIT 1
    `, [userId]);

    if (res.rows.length > 0) {
      const sub = res.rows[0] as any;
      return {
        isPremium: true,
        expiresAt: sub.expires_at,
        planName: sub.plan_name || 'Premium VIP'
      };
    }
    return { isPremium: false };
  } catch (err) {
    console.error('[SubscriptionCheck] Error:', err);
    return { isPremium: false };
  }
}

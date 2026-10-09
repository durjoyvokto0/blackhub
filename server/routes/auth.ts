import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { pg } from '../db.js';
import {
  AuthRequest,
  checkLoginRateLimit,
  recordLoginAttempt,
  createSession,
  revokeUserSessions,
  requireAuth,
  logAdminAction,
  checkUserSubscription,
  generateToken
} from '../auth.js';

const router = Router();

// Register new user
router.post('/register', async (req: AuthRequest, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (username.length < 3 || username.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(username)) {
      return res.status(400).json({ error: 'Username must be 3-30 characters (letters, numbers, underscores, dashes).' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Check unique username or email
    const existing = await pg.query('SELECT username, email FROM users WHERE username = $1 OR email = $2', [username, email.toLowerCase()]);
    if (existing.rows.length > 0) {
      const match = existing.rows[0] as any;
      if (match.username.toLowerCase() === username.toLowerCase()) {
        return res.status(409).json({ error: 'Username is already taken.' });
      }
      return res.status(409).json({ error: 'Email address is already registered.' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const verificationToken = generateToken(24);

    const userRes = await pg.query(`
      INSERT INTO users (username, email, password_hash, role, is_email_verified, verification_token)
      VALUES ($1, $2, $3, 'Registered User', FALSE, $4)
      RETURNING id, username, email, role, is_email_verified, force_password_change
    `, [username, email.toLowerCase(), passwordHash, verificationToken]);

    const newUser = userRes.rows[0] as any;

    // Create user profile
    await pg.query(`
      INSERT INTO user_profiles (user_id, display_name, bio)
      VALUES ($1, $2, 'BlackHub Community Member')
    `, [newUser.id, username]);

    // Create initial session
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const sessionId = await createSession(newUser.id, ip, userAgent);

    // Initial welcome notification
    await pg.query(`
      INSERT INTO notifications (user_id, title, message, type)
      VALUES ($1, 'Welcome to BlackHub', 'Thank you for joining BlackHub. Verify your email to unlock all features, or upgrade to Premium for an ad-free 4K experience.', 'info')
    `, [newUser.id]);

    return res.status(201).json({
      message: 'Registration successful. Email verification code generated.',
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        isEmailVerified: newUser.is_email_verified,
        forcePasswordChange: false,
        isPremium: false
      },
      verificationCode: verificationToken.substring(0, 6).toUpperCase(),
      sessionToken: sessionId
    });
  } catch (err: any) {
    console.error('[Auth Register Error]:', err);
    return res.status(500).json({ error: 'Registration failed due to a server error.' });
  }
});

// Login
router.post('/login', async (req: AuthRequest, res) => {
  try {
    const { login, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!login || !password) {
      return res.status(400).json({ error: 'Username/Email and password are required.' });
    }

    // Check rate limit
    const rateCheck = await checkLoginRateLimit(`${ip}:${login}`);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        error: `Too many failed login attempts. Please wait ${Math.ceil((rateCheck.retryAfterSec || 900) / 60)} minutes before trying again.`
      });
    }

    // Query user by username or email
    const userRes = await pg.query(`
      SELECT id, username, email, password_hash, role, is_email_verified, force_password_change, status
      FROM users
      WHERE username = $1 OR email = $1
    `, [login.toLowerCase()]);

    if (userRes.rows.length === 0) {
      await recordLoginAttempt(`${ip}:${login}`, false);
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    const user = userRes.rows[0] as any;

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'This account has been banned due to violation of platform policies.' });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({ error: 'This account is currently suspended. Please contact support.' });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      await recordLoginAttempt(`${ip}:${login}`, false);
      return res.status(401).json({ error: 'Invalid username/email or password.' });
    }

    // Record success
    await recordLoginAttempt(`${ip}:${login}`, true);

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const sessionId = await createSession(user.id, ip, userAgent);

    const sub = await checkUserSubscription(user.id);

    return res.json({
      message: 'Login successful.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isEmailVerified: Boolean(user.is_email_verified),
        forcePasswordChange: Boolean(user.force_password_change),
        isPremium: sub.isPremium,
        subscriptionExpiresAt: sub.expiresAt,
        subscriptionPlan: sub.planName
      },
      sessionToken: sessionId
    });
  } catch (err: any) {
    console.error('[Auth Login Error]:', err);
    return res.status(500).json({ error: 'Login failed due to a server error.' });
  }
});

// Admin Login endpoint
router.post('/admin-login', async (req: AuthRequest, res) => {
  try {
    const { username, password } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required.' });
    }

    const rateCheck = await checkLoginRateLimit(`admin:${ip}:${username}`);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: 'Too many admin login attempts. Please try again later.' });
    }

    const userRes = await pg.query(`
      SELECT id, username, email, password_hash, role, is_email_verified, force_password_change, status
      FROM users
      WHERE username = $1 AND role = 'Administrator'
    `, [username]);

    if (userRes.rows.length === 0) {
      await recordLoginAttempt(`admin:${ip}:${username}`, false);
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    const user = userRes.rows[0] as any;
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      await recordLoginAttempt(`admin:${ip}:${username}`, false);
      return res.status(401).json({ error: 'Invalid administrator credentials.' });
    }

    await recordLoginAttempt(`admin:${ip}:${username}`, true);

    const userAgent = req.headers['user-agent'] || 'Unknown';
    const sessionId = await createSession(user.id, ip, userAgent);

    await logAdminAction(user.id, user.username, 'ADMIN_LOGIN', 'auth', user.id, 'Administrator logged into management portal', ip);

    return res.json({
      message: 'Admin authentication successful.',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        isEmailVerified: Boolean(user.is_email_verified),
        forcePasswordChange: Boolean(user.force_password_change)
      },
      sessionToken: sessionId
    });
  } catch (err: any) {
    console.error('[Admin Login Error]:', err);
    return res.status(500).json({ error: 'Admin login failed.' });
  }
});

// Current User State
router.get('/me', async (req: AuthRequest, res) => {
  if (!req.user) {
    return res.json({ user: null });
  }

  try {
    const profileRes = await pg.query(`
      SELECT u.id, u.username, u.email, u.role, u.is_email_verified, u.force_password_change, u.status,
             p.display_name, p.avatar_url, p.bio, p.subscribers_count
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      WHERE u.id = $1
    `, [req.user.id]);

    if (profileRes.rows.length === 0) {
      return res.json({ user: null });
    }

    const profile = profileRes.rows[0] as any;
    const sub = await checkUserSubscription(req.user.id);

    return res.json({
      user: {
        id: profile.id,
        username: profile.username,
        email: profile.email,
        role: profile.role,
        isEmailVerified: Boolean(profile.is_email_verified),
        forcePasswordChange: Boolean(profile.force_password_change),
        displayName: profile.display_name || profile.username,
        avatarUrl: profile.avatar_url,
        bio: profile.bio,
        subscribersCount: profile.subscribers_count || 0,
        isPremium: sub.isPremium,
        subscriptionExpiresAt: sub.expiresAt,
        subscriptionPlan: sub.planName
      }
    });
  } catch (err: any) {
    console.error('[Me Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
});

// Logout
router.post('/logout', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.sessionId) {
      await pg.query('UPDATE sessions SET is_revoked = TRUE WHERE id = $1', [req.sessionId]);
    }
    return res.json({ message: 'Logged out successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Logout failed.' });
  }
});

// Change Password (or first login forced change)
router.post('/change-password', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user!.id;

    if (!newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    // Fetch user hash
    const userRes = await pg.query('SELECT password_hash, force_password_change, role, username FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0] as any;

    // If forced password change, currentPassword is optional if provided or verified
    if (!user.force_password_change) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required.' });
      }
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) {
        return res.status(400).json({ error: 'Incorrect current password.' });
      }
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await pg.query(`
      UPDATE users 
      SET password_hash = $1, force_password_change = FALSE, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [newHash, userId]);

    // Revoke all other sessions for security
    await revokeUserSessions(userId, req.sessionId);

    if (user.role === 'Administrator') {
      const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
      await logAdminAction(userId, user.username, 'PASSWORD_CHANGE', 'auth', userId, 'Administrator changed account password', ip);
    }

    return res.json({ message: 'Password updated successfully. Other sessions have been signed out.' });
  } catch (err: any) {
    console.error('[Change Password Error]:', err);
    return res.status(500).json({ error: 'Password change failed.' });
  }
});

// Email verification
router.post('/verify-email', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { code } = req.body;
    const userId = req.user!.id;

    const userRes = await pg.query('SELECT verification_token, is_email_verified FROM users WHERE id = $1', [userId]);
    const user = userRes.rows[0] as any;

    if (user.is_email_verified) {
      return res.json({ message: 'Email is already verified.' });
    }

    if (!code) {
      return res.status(400).json({ error: 'Verification code is required.' });
    }

    const tokenPrefix = (user.verification_token || '').substring(0, 6).toUpperCase();
    if (code.toUpperCase() !== tokenPrefix && code !== user.verification_token) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' });
    }

    await pg.query('UPDATE users SET is_email_verified = TRUE, verification_token = NULL WHERE id = $1', [userId]);

    return res.json({ message: 'Email address verified successfully!' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Email verification failed.' });
  }
});

// Password recovery request
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email address is required.' });
    }

    const userRes = await pg.query('SELECT id, username, email FROM users WHERE email = $1', [email.toLowerCase()]);
    if (userRes.rows.length === 0) {
      // Don't leak user existence
      return res.json({ message: 'If an account exists with this email, a reset token has been issued.' });
    }

    const user = userRes.rows[0] as any;
    const resetToken = generateToken(20);

    // Store in verification_token column with reset marker
    await pg.query(`
      UPDATE users 
      SET verification_token = $1 
      WHERE id = $2
    `, [`RESET:${resetToken}`, user.id]);

    return res.json({
      message: 'Password reset token generated. In a production environment, this is dispatched via transactional email.',
      resetToken: resetToken
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Password recovery request failed.' });
  }
});

// Reset password with token
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Valid token and password of at least 8 characters required.' });
    }

    const userRes = await pg.query('SELECT id FROM users WHERE verification_token = $1', [`RESET:${token}`]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired password reset token.' });
    }

    const userId = (userRes.rows[0] as any).id;
    const newHash = await bcrypt.hash(newPassword, 10);

    await pg.query(`
      UPDATE users 
      SET password_hash = $1, verification_token = NULL 
      WHERE id = $2
    `, [newHash, userId]);

    // Revoke sessions
    await revokeUserSessions(userId);

    return res.json({ message: 'Password has been reset successfully. You can now log in.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to reset password.' });
  }
});

// Account Settings Update
router.put('/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { displayName, bio, avatarUrl } = req.body;

    await pg.query(`
      UPDATE user_profiles 
      SET display_name = COALESCE($1, display_name),
          bio = COALESCE($2, bio),
          avatar_url = COALESCE($3, avatar_url)
      WHERE user_id = $4
    `, [displayName, bio, avatarUrl, userId]);

    return res.json({ message: 'Profile settings updated successfully.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

// Account Deletion Request
router.post('/delete-account', requireAuth, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { confirmPassword } = req.body;

    if (req.user!.role === 'Administrator') {
      return res.status(400).json({ error: 'Primary administrator account cannot be deleted.' });
    }

    const userRes = await pg.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
    const match = await bcrypt.compare(confirmPassword, (userRes.rows[0] as any).password_hash);
    if (!match) {
      return res.status(400).json({ error: 'Incorrect password confirmation.' });
    }

    await revokeUserSessions(userId);
    await pg.query('DELETE FROM users WHERE id = $1', [userId]);

    return res.json({ message: 'Account deleted permanently.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Account deletion failed.' });
  }
});

export default router;

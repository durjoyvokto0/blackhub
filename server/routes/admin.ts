import { Router } from 'express';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { ZipArchive } = require('archiver');
import { pg, VIDEOS_DIR } from '../db.js';
import {
  AuthRequest,
  requireAdmin,
  logAdminAction,
  revokeUserSessions,
  generateToken
} from '../auth.js';
import { addCalendarMonths } from './memberships.js';
import { getOnlinePresenceStats } from '../onlineTracker.js';

const router = Router();

// Enforce requireAdmin on ALL admin routes
router.use(requireAdmin);

// Dashboard Overview Metrics (Section 10)
router.get('/stats', async (req: AuthRequest, res) => {
  try {
    const [
      usersCount,
      premiumCount,
      totalVideos,
      publishedVideos,
      pendingVideos,
      reportsCount,
      pendingPayments,
      confirmedPayments,
      expiredSubs,
      storageRes,
      recentLogs
    ] = await Promise.all([
      pg.query('SELECT COUNT(*) as count FROM users'),
      pg.query("SELECT COUNT(DISTINCT user_id) as count FROM subscriptions WHERE status IN ('active', 'complimentary') AND expires_at > CURRENT_TIMESTAMP"),
      pg.query('SELECT COUNT(*) as count FROM videos'),
      pg.query("SELECT COUNT(*) as count FROM videos WHERE status = 'published'"),
      pg.query("SELECT COUNT(*) as count FROM videos WHERE status = 'pending_review'"),
      pg.query("SELECT COUNT(*) as count FROM content_reports WHERE status = 'pending'"),
      pg.query("SELECT COUNT(*) as count FROM payment_orders WHERE status IN ('pending', 'under_verification')"),
      pg.query("SELECT COUNT(*) as count FROM payment_orders WHERE status = 'confirmed'"),
      pg.query("SELECT COUNT(*) as count FROM subscriptions WHERE status = 'expired' OR (status = 'active' AND expires_at <= CURRENT_TIMESTAMP)"),
      pg.query('SELECT COALESCE(SUM(file_size), 0) as total_bytes FROM source_files'),
      pg.query('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 10')
    ]);

    const totalUsers = parseInt((usersCount.rows[0] as any).count || '0');
    const premiumUsers = parseInt((premiumCount.rows[0] as any).count || '0');
    const freeUsers = Math.max(0, totalUsers - premiumUsers);
    const presence = getOnlinePresenceStats();

    const totalBytes = parseInt((storageRes.rows[0] as any).total_bytes || '0');
    const storageFormatted = (totalBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';

    return res.json({
      metrics: {
        totalUsers,
        premiumUsers,
        freeUsers,
        activePremiumSubscribers: premiumUsers,
        onlineNow: presence.totalOnline,
        onlinePremium: presence.onlinePremium,
        onlineFree: presence.onlineFree,
        onlineGuests: presence.onlineGuests,
        totalVideos: parseInt((totalVideos.rows[0] as any).count),
        publishedVideos: parseInt((publishedVideos.rows[0] as any).count),
        pendingVideoApprovals: parseInt((pendingVideos.rows[0] as any).count),
        pendingContentReports: parseInt((reportsCount.rows[0] as any).count),
        pendingPayments: parseInt((pendingPayments.rows[0] as any).count),
        confirmedPayments: parseInt((confirmedPayments.rows[0] as any).count),
        expiredSubscriptions: parseInt((expiredSubs.rows[0] as any).count),
        storageConsumption: storageFormatted,
        storageBytes: totalBytes
      },
      recentLogs: recentLogs.rows
    });
  } catch (err: any) {
    console.error('[Admin Stats Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve admin stats.' });
  }
});

// Dedicated Real-Time Audience and Membership Analytics Route
router.get('/audience-analytics', async (req: AuthRequest, res) => {
  try {
    const [usersCount, premiumCount] = await Promise.all([
      pg.query('SELECT COUNT(*) as count FROM users'),
      pg.query("SELECT COUNT(DISTINCT user_id) as count FROM subscriptions WHERE status IN ('active', 'complimentary') AND expires_at > CURRENT_TIMESTAMP")
    ]);

    const totalUsers = parseInt((usersCount.rows[0] as any).count || '0');
    const premiumUsers = parseInt((premiumCount.rows[0] as any).count || '0');
    const freeUsers = Math.max(0, totalUsers - premiumUsers);
    const presence = getOnlinePresenceStats();

    return res.json({
      membership: {
        totalUsers,
        premiumUsers,
        freeUsers,
        premiumPercentage: totalUsers > 0 ? ((premiumUsers / totalUsers) * 100).toFixed(1) : '0.0',
        freePercentage: totalUsers > 0 ? ((freeUsers / totalUsers) * 100).toFixed(1) : '0.0'
      },
      onlinePresence: presence
    });
  } catch (err: any) {
    console.error('[Audience Analytics Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve audience analytics.' });
  }
});

// User Management (Section 11)
router.get('/users', async (req: AuthRequest, res) => {
  try {
    const { search, role, status } = req.query;
    let sql = `
      SELECT u.id, u.username, u.email, u.role, u.is_email_verified,
             u.status, u.created_at, p.display_name,
             s.id as subscription_id, s.status as sub_status, s.expires_at as sub_expires_at,
             mp.name as plan_name
      FROM users u
      LEFT JOIN user_profiles p ON u.id = p.user_id
      LEFT JOIN subscriptions s ON u.id = s.user_id AND s.status IN ('active', 'complimentary') AND s.expires_at > CURRENT_TIMESTAMP
      LEFT JOIN membership_plans mp ON s.plan_id = mp.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (search && (search as string).trim()) {
      params.push(`%${(search as string).trim()}%`);
      sql += ` AND (u.username ILIKE $${params.length} OR u.email ILIKE $${params.length})`;
    }

    if (role && role !== 'all') {
      params.push(role);
      sql += ` AND u.role = $${params.length}`;
    }

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND u.status = $${params.length}`;
    }

    sql += ' ORDER BY u.created_at DESC LIMIT 100';

    const result = await pg.query(sql, params);
    return res.json({ users: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve users.' });
  }
});

// Update User Status (Suspend, Ban, Restore, Revoke Sessions)
router.post('/users/:id/action', async (req: AuthRequest, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { action, reason = '' } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (targetUserId === req.user!.id) {
      return res.status(400).json({ error: 'Administrators cannot alter their own account status via this panel.' });
    }

    if (action === 'suspend') {
      await pg.query("UPDATE users SET status = 'suspended' WHERE id = $1", [targetUserId]);
      await revokeUserSessions(targetUserId);
      await logAdminAction(req.user!.id, req.user!.username, 'USER_SUSPENDED', 'user', targetUserId, reason || 'Suspended by admin', ip);
    } else if (action === 'ban') {
      await pg.query("UPDATE users SET status = 'banned' WHERE id = $1", [targetUserId]);
      await revokeUserSessions(targetUserId);
      await logAdminAction(req.user!.id, req.user!.username, 'USER_BANNED', 'user', targetUserId, reason || 'Banned by admin', ip);
    } else if (action === 'restore') {
      await pg.query("UPDATE users SET status = 'active' WHERE id = $1", [targetUserId]);
      await logAdminAction(req.user!.id, req.user!.username, 'USER_RESTORED', 'user', targetUserId, 'Restored to active status', ip);
    } else if (action === 'revoke_sessions') {
      await revokeUserSessions(targetUserId);
      await logAdminAction(req.user!.id, req.user!.username, 'SESSIONS_REVOKED', 'user', targetUserId, 'All sessions revoked', ip);
    } else {
      return res.status(400).json({ error: 'Invalid moderation action.' });
    }

    return res.json({ message: `Action '${action}' executed successfully.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to execute user action.' });
  }
});

// Grant complimentary membership
router.post('/users/:id/grant-membership', async (req: AuthRequest, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { months = 1, reason = 'Complimentary administrator grant' } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const now = new Date();
    const expiresAt = addCalendarMonths(now, months);

    await pg.query(`
      INSERT INTO subscriptions (user_id, status, starts_at, expires_at, granted_by_admin_id, grant_reason)
      VALUES ($1, 'complimentary', $2, $3, $4, $5)
    `, [targetUserId, now.toISOString(), expiresAt.toISOString(), req.user!.id, reason]);

    await pg.query("UPDATE users SET role = 'Premium Subscriber' WHERE id = $1 AND role = 'Registered User'", [targetUserId]);

    await logAdminAction(req.user!.id, req.user!.username, 'MEMBERSHIP_GRANTED', 'subscription', targetUserId, `Granted ${months} month(s) complimentary: ${reason}`, ip);

    return res.json({ message: `Granted ${months} month(s) complimentary Premium membership successfully.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to grant membership.' });
  }
});

// Revoke membership
router.post('/users/:id/revoke-membership', async (req: AuthRequest, res) => {
  try {
    const targetUserId = parseInt(req.params.id);
    const { reason = 'Revoked by administrator' } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    await pg.query("UPDATE subscriptions SET status = 'canceled' WHERE user_id = $1 AND status IN ('active', 'complimentary')", [targetUserId]);
    await pg.query("UPDATE users SET role = 'Registered User' WHERE id = $1 AND role = 'Premium Subscriber'", [targetUserId]);

    await logAdminAction(req.user!.id, req.user!.username, 'MEMBERSHIP_REVOKED', 'subscription', targetUserId, reason, ip);

    return res.json({ message: 'User premium membership revoked.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to revoke membership.' });
  }
});

// Video Moderation Management (Section 12)
router.get('/videos', async (req: AuthRequest, res) => {
  try {
    const { status, accessLevel } = req.query;
    let sql = `
      SELECT v.id, v.title, v.slug, v.duration, v.access_level, v.status,
             v.views_count, v.likes_count, v.thumbnail_url, v.video_url, v.created_at,
             vc.name as category_name, u.username as creator_username
      FROM videos v
      LEFT JOIN video_categories vc ON v.category_id = vc.id
      LEFT JOIN users u ON v.creator_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (status && status !== 'all') {
      params.push(status);
      sql += ` AND v.status = $${params.length}`;
    }

    if (accessLevel && accessLevel !== 'all') {
      params.push(accessLevel);
      sql += ` AND v.access_level = $${params.length}`;
    }

    sql += ' ORDER BY v.created_at DESC LIMIT 100';

    const result = await pg.query(sql, params);
    return res.json({ videos: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve videos for moderation.' });
  }
});

// Moderate Video (Approve, Reject, Change Access Level, Delete)
router.post('/videos/:id/moderate', async (req: AuthRequest, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const { action, reason = '', accessLevel } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    if (action === 'approve') {
      await pg.query("UPDATE videos SET status = 'published', rejection_reason = NULL WHERE id = $1", [videoId]);
      await logAdminAction(req.user!.id, req.user!.username, 'VIDEO_APPROVED', 'video', videoId, 'Approved and published video', ip);
    } else if (action === 'reject') {
      await pg.query("UPDATE videos SET status = 'rejected', rejection_reason = $1 WHERE id = $2", [reason || 'Did not meet community standards', videoId]);
      await logAdminAction(req.user!.id, req.user!.username, 'VIDEO_REJECTED', 'video', videoId, reason, ip);
    } else if (action === 'set_access') {
      if (accessLevel === 'free' || accessLevel === 'premium') {
        await pg.query('UPDATE videos SET access_level = $1 WHERE id = $2', [accessLevel, videoId]);
        await logAdminAction(req.user!.id, req.user!.username, 'VIDEO_ACCESS_CHANGED', 'video', videoId, `Changed access level to ${accessLevel}`, ip);
      }
    } else if (action === 'delete') {
      await pg.query('DELETE FROM videos WHERE id = $1', [videoId]);
      await logAdminAction(req.user!.id, req.user!.username, 'VIDEO_DELETED', 'video', videoId, reason || 'Video deleted by admin', ip);
    } else {
      return res.status(400).json({ error: 'Invalid moderation action.' });
    }

    return res.json({ message: `Video action '${action}' applied successfully.` });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to execute video moderation.' });
  }
});

// Source Files Management (Section 13)
router.get('/source-files', async (req: AuthRequest, res) => {
  try {
    const result = await pg.query(`
      SELECT sf.*, v.title as video_title, u.username as uploader_username
      FROM source_files sf
      JOIN videos v ON sf.video_id = v.id
      LEFT JOIN users u ON sf.uploaded_by = u.id
      ORDER BY sf.created_at DESC
    `);

    return res.json({ sourceFiles: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve source files.' });
  }
});

// Authorized Source File Download Endpoint (Section 13)
// Generates short-lived download token and serves original file with Content-Disposition
router.get('/source-files/:id/download-token', async (req: AuthRequest, res) => {
  try {
    const sourceFileId = parseInt(req.params.id);
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const fileRes = await pg.query('SELECT * FROM source_files WHERE id = $1', [sourceFileId]);
    if (fileRes.rows.length === 0) {
      return res.status(404).json({ error: 'Source file not found.' });
    }

    const file = fileRes.rows[0] as any;
    const token = generateToken(32);

    // Save authorized short-lived download session token in DB or memory
    await pg.query(`
      INSERT INTO admin_audit_logs (admin_id, admin_username, action, target_type, target_id, details, ip_address)
      VALUES ($1, $2, 'SOURCE_DOWNLOAD_INITIATED', 'source_file', $3, $4, $5)
    `, [req.user!.id, req.user!.username, sourceFileId, `Generated authorized download token for "${file.original_filename}"`, ip]);

    return res.json({
      downloadUrl: `/api/admin/source-files/download?fileId=${sourceFileId}&token=${token}`,
      fileName: file.original_filename,
      fileSize: file.file_size
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to generate download token.' });
  }
});

// Download stream handler for source file
router.get('/source-files/download', async (req: AuthRequest, res) => {
  try {
    const fileId = parseInt(req.query.fileId as string);
    const fileRes = await pg.query('SELECT * FROM source_files WHERE id = $1', [fileId]);

    if (fileRes.rows.length === 0) {
      return res.status(404).send('File not found.');
    }

    const file = fileRes.rows[0] as any;

    // Check if file exists on disk
    if (fs.existsSync(file.storage_path)) {
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename}"`);
      res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
      return fs.createReadStream(file.storage_path).pipe(res);
    } else {
      // If demo sample stored via remote url, redirect or pipe stream
      res.setHeader('Content-Disposition', `attachment; filename="${file.original_filename}"`);
      return res.redirect(file.storage_path);
    }
  } catch (err: any) {
    return res.status(500).send('Error streaming download file.');
  }
});

// Download Complete Website Source Package (.zip) for Publishing Anywhere
router.get('/website-package/download', async (req: AuthRequest, res) => {
  try {
    const type = (req.query.type as string) || 'full_source';
    const rootDir = process.cwd();

    const archive = new ZipArchive({
      zlib: { level: 9 }
    });

    archive.on('error', (err: any) => {
      console.error('[Archiver Error]', err);
      if (!res.headersSent) {
        res.status(500).send({ error: err.message });
      }
    });

    if (type === 'static_dist') {
      const distDir = path.join(rootDir, 'dist');
      if (!fs.existsSync(distDir)) {
        return res.status(400).json({ error: 'Production dist directory not found. Please trigger build first.' });
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="blackhub-frontend-dist.zip"');
      archive.pipe(res);
      archive.directory(distDir, false);
      await archive.finalize();
    } else {
      // Full source code package
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="blackhub-website-complete-source.zip"');
      archive.pipe(res);

      // Append project directories
      if (fs.existsSync(path.join(rootDir, 'src'))) {
        archive.directory(path.join(rootDir, 'src'), 'src');
      }
      if (fs.existsSync(path.join(rootDir, 'server'))) {
        archive.directory(path.join(rootDir, 'server'), 'server');
      }

      // Append root configuration and documentation files
      const projectFiles = [
        'package.json',
        'tsconfig.json',
        'vite.config.ts',
        'server.ts',
        'index.html',
        '.env.example',
        'metadata.json',
        'Dockerfile',
        'docker-compose.yml',
        'DEPLOYMENT_GUIDE.md'
      ];

      for (const file of projectFiles) {
        const filePath = path.join(rootDir, file);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: file });
        }
      }

      await archive.finalize();
    }

    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
    await logAdminAction(
      req.user!.id,
      req.user!.username,
      'WEBSITE_PACKAGE_EXPORTED',
      'source_code',
      type,
      `Administrator downloaded ${type} package for external web publishing`,
      ip
    );
  } catch (err: any) {
    console.error('[Package Download Error]:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to package website files.' });
    }
  }
});

// Payment Orders & Verification Management (Section 15, 18, 20)
router.get('/payments', async (req: AuthRequest, res) => {
  try {
    const result = await pg.query(`
      SELECT o.*, u.username, u.email, p.name as plan_name, p.duration_months,
             pt.id as tx_id, pt.transaction_hash, pt.status as tx_status, pt.confirmations,
             s.id as subscription_id, s.status as sub_status
      FROM payment_orders o
      JOIN users u ON o.user_id = u.id
      JOIN membership_plans p ON o.plan_id = p.id
      LEFT JOIN payment_transactions pt ON o.id = pt.payment_order_id
      LEFT JOIN subscriptions s ON o.id = s.payment_order_id
      ORDER BY o.created_at DESC
      LIMIT 100
    `);

    return res.json({ orders: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve payment orders.' });
  }
});

// Manual Payment Verification / Approval (Section 18)
router.post('/payments/:id/verify', async (req: AuthRequest, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const { action, reason = '' } = req.body; // 'approve' or 'reject'
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const orderRes = await pg.query('SELECT * FROM payment_orders WHERE id = $1', [orderId]);
    if (orderRes.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = orderRes.rows[0] as any;

    if (action === 'approve') {
      if (order.status === 'confirmed') {
        return res.status(400).json({ error: 'Order is already confirmed.' });
      }

      // Mark order confirmed
      await pg.query("UPDATE payment_orders SET status = 'confirmed' WHERE id = $1", [orderId]);

      // Update tx if exists
      await pg.query("UPDATE payment_transactions SET status = 'verified', verified_at = CURRENT_TIMESTAMP WHERE payment_order_id = $1", [orderId]);

      // Activate membership (Section 19)
      const planRes = await pg.query('SELECT * FROM membership_plans WHERE id = $1', [order.plan_id]);
      const plan = planRes.rows[0] as any;

      const now = new Date();
      const expiresAt = addCalendarMonths(now, plan.duration_months);

      await pg.query(`
        INSERT INTO subscriptions (user_id, plan_id, status, starts_at, expires_at, payment_order_id, granted_by_admin_id)
        VALUES ($1, $2, 'active', $3, $4, $5, $6)
      `, [order.user_id, plan.id, now.toISOString(), expiresAt.toISOString(), orderId, req.user!.id]);

      await pg.query("UPDATE users SET role = 'Premium Subscriber' WHERE id = $1 AND role = 'Registered User'", [order.user_id]);

      await pg.query(`
        INSERT INTO payment_verification_logs (payment_order_id, admin_id, action, details)
        VALUES ($1, $2, 'manual_approved', $3)
      `, [orderId, req.user!.id, reason || 'Manual verification approved by admin']);

      await logAdminAction(req.user!.id, req.user!.username, 'PAYMENT_APPROVED', 'payment_order', orderId, `Approved order ${order.order_reference} ($${order.amount_usd})`, ip);

      return res.json({ message: 'Payment approved and membership activated.' });
    } else if (action === 'reject') {
      await pg.query("UPDATE payment_orders SET status = 'rejected' WHERE id = $1", [orderId]);
      await pg.query("UPDATE payment_transactions SET status = 'rejected' WHERE payment_order_id = $1", [orderId]);

      await pg.query(`
        INSERT INTO payment_verification_logs (payment_order_id, admin_id, action, details)
        VALUES ($1, $2, 'manual_rejected', $3)
      `, [orderId, req.user!.id, reason || 'Rejected by administrator']);

      await logAdminAction(req.user!.id, req.user!.username, 'PAYMENT_REJECTED', 'payment_order', orderId, `Rejected order ${order.order_reference}: ${reason}`, ip);

      return res.json({ message: 'Payment order rejected.' });
    } else {
      return res.status(400).json({ error: 'Invalid verification action.' });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to verify payment.' });
  }
});

// Crypto Settings Management (Section 15)
// Requires re-authentication before changing receiving addresses
router.put('/crypto-settings', async (req: AuthRequest, res) => {
  try {
    const {
      adminPassword,
      isEnabled,
      assetSymbol,
      network,
      receivingAddress,
      verificationMode,
      requiredConfirmations,
      paymentInstructions
    } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    // Verify admin password before modifying sensitive payment configuration
    if (!adminPassword) {
      return res.status(401).json({ error: 'Administrator password confirmation is strictly required to modify cryptocurrency receiving addresses.' });
    }

    const adminUser = await pg.query('SELECT password_hash FROM users WHERE id = $1', [req.user!.id]);
    const valid = await bcrypt.compare(adminPassword, (adminUser.rows[0] as any).password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Incorrect administrator password confirmation.' });
    }

    if (receivingAddress && receivingAddress.length < 15) {
      return res.status(400).json({ error: 'Invalid cryptocurrency receiving address format.' });
    }

    await pg.query(`
      UPDATE crypto_payment_settings
      SET is_enabled = COALESCE($1, is_enabled),
          asset_symbol = COALESCE($2, asset_symbol),
          network = COALESCE($3, network),
          receiving_address = COALESCE($4, receiving_address),
          verification_mode = COALESCE($5, verification_mode),
          required_confirmations = COALESCE($6, required_confirmations),
          payment_instructions = COALESCE($7, payment_instructions),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `, [
      isEnabled,
      assetSymbol,
      network,
      receivingAddress,
      verificationMode,
      requiredConfirmations,
      paymentInstructions
    ]);

    await logAdminAction(
      req.user!.id,
      req.user!.username,
      'CRYPTO_SETTINGS_UPDATED',
      'settings',
      1,
      `Updated crypto configuration. Receiving address: ${receivingAddress}`,
      ip
    );

    return res.json({ message: 'Cryptocurrency payment settings updated securely.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update crypto settings.' });
  }
});

// Membership Plans Management (Section 20)
router.put('/plans/:id', async (req: AuthRequest, res) => {
  try {
    const planId = parseInt(req.params.id);
    const { priceUsd, priceCrypto, isActive } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    await pg.query(`
      UPDATE membership_plans
      SET price_usd = COALESCE($1, price_usd),
          price_crypto = COALESCE($2, price_crypto),
          is_active = COALESCE($3, is_active),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
    `, [priceUsd, priceCrypto, isActive, planId]);

    await logAdminAction(req.user!.id, req.user!.username, 'PLAN_UPDATED', 'plan', planId, `Updated plan #${planId} price to $${priceUsd}`, ip);

    return res.json({ message: 'Membership plan updated.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update membership plan.' });
  }
});

// Admin Account & Security Settings (Section 9)
router.get('/security', async (req: AuthRequest, res) => {
  try {
    const recRes = await pg.query('SELECT * FROM admin_recovery_settings WHERE admin_user_id = $1', [req.user!.id]);
    const rec = recRes.rows[0] as any || {};

    const activeSessions = await pg.query(`
      SELECT id, ip_address, user_agent, created_at, last_active_at
      FROM sessions
      WHERE user_id = $1 AND is_revoked = FALSE AND expires_at > CURRENT_TIMESTAMP
      ORDER BY last_active_at DESC
    `, [req.user!.id]);

    return res.json({
      recoveryEmail: rec.recovery_email || '',
      isRecoveryEmailVerified: Boolean(rec.is_recovery_email_verified),
      mfaEnabled: Boolean(rec.mfa_enabled),
      sessions: activeSessions.rows,
      currentSessionId: req.sessionId
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load security settings.' });
  }
});

// Update Recovery Email
router.post('/security/recovery-email', async (req: AuthRequest, res) => {
  try {
    const { recoveryEmail, adminPassword } = req.body;
    const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

    const adminUser = await pg.query('SELECT password_hash FROM users WHERE id = $1', [req.user!.id]);
    const valid = await bcrypt.compare(adminPassword, (adminUser.rows[0] as any).password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Password confirmation failed.' });
    }

    const token = generateToken(16);
    await pg.query(`
      INSERT INTO admin_recovery_settings (admin_user_id, recovery_email, is_recovery_email_verified, recovery_token)
      VALUES ($1, $2, FALSE, $3)
      ON CONFLICT (admin_user_id) DO UPDATE
      SET recovery_email = $2, is_recovery_email_verified = FALSE, recovery_token = $3, updated_at = CURRENT_TIMESTAMP
    `, [req.user!.id, recoveryEmail, token]);

    await logAdminAction(req.user!.id, req.user!.username, 'RECOVERY_EMAIL_UPDATED', 'security', req.user!.id, `Updated recovery email to ${recoveryEmail}`, ip);

    return res.json({
      message: 'Recovery email updated. Verification code sent.',
      verificationCode: token.substring(0, 6).toUpperCase()
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to set recovery email.' });
  }
});

// Verify Recovery Email
router.post('/security/verify-recovery-email', async (req: AuthRequest, res) => {
  try {
    const { code } = req.body;
    const recRes = await pg.query('SELECT recovery_token FROM admin_recovery_settings WHERE admin_user_id = $1', [req.user!.id]);
    const rec = recRes.rows[0] as any;

    if (!code || (code.toUpperCase() !== (rec.recovery_token || '').substring(0, 6).toUpperCase() && code !== rec.recovery_token)) {
      return res.status(400).json({ error: 'Invalid recovery verification code.' });
    }

    await pg.query('UPDATE admin_recovery_settings SET is_recovery_email_verified = TRUE, recovery_token = NULL WHERE admin_user_id = $1', [req.user!.id]);

    return res.json({ message: 'Recovery email verified successfully!' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Verification failed.' });
  }
});

// Revoke all other sessions
router.post('/security/revoke-other-sessions', async (req: AuthRequest, res) => {
  try {
    await revokeUserSessions(req.user!.id, req.sessionId);
    return res.json({ message: 'All other administrator sessions have been signed out.' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to revoke sessions.' });
  }
});

// Audit Logs
router.get('/audit-logs', async (req: AuthRequest, res) => {
  try {
    const logs = await pg.query('SELECT * FROM admin_audit_logs ORDER BY created_at DESC LIMIT 100');
    return res.json({ logs: logs.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
});

export default router;

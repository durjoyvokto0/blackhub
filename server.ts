import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { initDatabase, UPLOADS_DIR, pg } from './server/db.js';
import { authMiddleware } from './server/auth.js';
import { recordPresence } from './server/onlineTracker.js';
import authRoutes from './server/routes/auth.js';
import videoRoutes from './server/routes/videos.js';
import membershipRoutes from './server/routes/memberships.js';
import adminRoutes from './server/routes/admin.js';
import reportRoutes from './server/routes/reports.js';
import testSuiteRoutes from './server/routes/testSuite.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  // Initialize PostgreSQL database & seed initial schemas
  await initDatabase();

  // Middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static uploads directory (for uploaded thumbnails & videos)
  app.use('/uploads', express.static(UPLOADS_DIR));

  // Global Session Authentication Middleware
  app.use(authMiddleware);

  // Mount API Endpoints
  app.use('/api/auth', authRoutes);
  app.use('/api/videos', videoRoutes);
  app.use('/api/memberships', membershipRoutes);
  app.use('/api/admin', adminRoutes);
  app.use('/api/community', reportRoutes);
  app.use('/api/test-suite', testSuiteRoutes);

  // Live audience presence heartbeat endpoint (tracks online visitors & members)
  app.post('/api/heartbeat', async (req: any, res) => {
    try {
      const visitorId = (req.body?.visitorId as string) || (req.headers['x-visitor-id'] as string) || req.sessionId || req.ip || 'guest-anon';
      const path = (req.body?.path as string) || '/';
      let isPremium = false;
      if (req.user) {
        const subRes = await pg.query(
          "SELECT id FROM subscriptions WHERE user_id = $1 AND status IN ('active', 'complimentary') AND expires_at > CURRENT_TIMESTAMP LIMIT 1",
          [req.user.id]
        );
        isPremium = subRes.rows.length > 0;
      }
      recordPresence({
        id: visitorId,
        userId: req.user?.id,
        username: req.user?.username,
        role: req.user?.role,
        isPremium,
        ip: req.ip || '127.0.0.1',
        userAgent: (req.headers['user-agent'] as string) || 'Browser',
        currentPath: path
      });
      return res.json({ ok: true });
    } catch {
      return res.json({ ok: false });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      platform: 'BlackHub',
      database: 'PostgreSQL (PGlite)',
      timestamp: new Date().toISOString()
    });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    // Mount Vite middlewares in development
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('[BlackHub] Vite dev server middleware mounted');
  } else {
    // Serve static files in production
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
    console.log('[BlackHub] Serving production build from dist');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[BlackHub Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[BlackHub Fatal Startup Error]:', err);
  process.exit(1);
});

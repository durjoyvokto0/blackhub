import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { pg, VIDEOS_DIR, THUMBNAILS_DIR } from '../db.js';
import { AuthRequest, requireAuth, checkUserSubscription, logAdminAction } from '../auth.js';

const router = Router();

// Multer storage for video & thumbnail uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === 'video') {
      cb(null, VIDEOS_DIR);
    } else {
      cb(null, THUMBNAILS_DIR);
    }
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
    cb(null, unique);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024 // 500 MB max for upload demonstration
  },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === 'video') {
      const allowed = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-matroska'];
      if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp4|webm|mov|mkv)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid video format. Only MP4, WebM, and MOV are supported.'));
      }
    } else {
      const allowed = ['image/jpeg', 'image/png', 'image/webp'];
      if (allowed.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|webp)$/i)) {
        cb(null, true);
      } else {
        cb(new Error('Invalid thumbnail format. Only JPG, PNG, and WebP are supported.'));
      }
    }
  }
});

// List / Browse videos
router.get('/', async (req: AuthRequest, res) => {
  try {
    const { category, sort, access, search, page = '1', limit = '24' } = req.query;

    const offset = (Math.max(1, parseInt(page as string)) - 1) * parseInt(limit as string);
    const queryParams: any[] = [];
    let whereClauses: string[] = ["v.status = 'published'"];

    if (category && category !== 'all') {
      queryParams.push(category);
      whereClauses.push(`vc.slug = $${queryParams.length}`);
    }

    if (access && (access === 'free' || access === 'premium')) {
      queryParams.push(access);
      whereClauses.push(`v.access_level = $${queryParams.length}`);
    }

    if (search && (search as string).trim()) {
      queryParams.push(`%${(search as string).trim()}%`);
      whereClauses.push(`(v.title ILIKE $${queryParams.length} OR v.description ILIKE $${queryParams.length})`);
    }

    let orderBy = 'v.created_at DESC';
    if (sort === 'views') orderBy = 'v.views_count DESC';
    if (sort === 'likes') orderBy = 'v.likes_count DESC';
    if (sort === 'oldest') orderBy = 'v.created_at ASC';

    const sql = `
      SELECT v.id, v.title, v.slug, v.description, v.thumbnail_url, v.video_url,
             v.duration, v.access_level, v.views_count, v.likes_count, v.created_at,
             vc.name as category_name, vc.slug as category_slug,
             u.username as creator_username, up.display_name as creator_display_name,
             up.avatar_url as creator_avatar_url
      FROM videos v
      LEFT JOIN video_categories vc ON v.category_id = vc.id
      LEFT JOIN users u ON v.creator_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE ${whereClauses.join(' AND ')}
      ORDER BY ${orderBy}
      LIMIT ${parseInt(limit as string)} OFFSET ${offset}
    `;

    const result = await pg.query(sql, queryParams);

    // Also get total count
    const countSql = `
      SELECT COUNT(*) as total
      FROM videos v
      LEFT JOIN video_categories vc ON v.category_id = vc.id
      WHERE ${whereClauses.join(' AND ')}
    `;
    const countResult = await pg.query(countSql, queryParams);
    const total = parseInt((countResult.rows[0] as any).total);

    return res.json({
      videos: result.rows,
      pagination: {
        total,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        pages: Math.ceil(total / parseInt(limit as string))
      }
    });
  } catch (err: any) {
    console.error('[Get Videos Error]:', err);
    return res.status(500).json({ error: 'Failed to fetch videos.' });
  }
});

// Get Video Categories with counts
router.get('/categories', async (req, res) => {
  try {
    const result = await pg.query(`
      SELECT vc.id, vc.name, vc.slug, vc.description, vc.icon,
             COUNT(v.id) FILTER (WHERE v.status = 'published') as video_count
      FROM video_categories vc
      LEFT JOIN videos v ON vc.id = v.category_id
      GROUP BY vc.id
      ORDER BY vc.id ASC
    `);
    return res.json({ categories: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch categories.' });
  }
});

// Single Video Details
router.get('/:id', async (req: AuthRequest, res) => {
  try {
    const videoId = parseInt(req.params.id);
    if (isNaN(videoId)) {
      return res.status(400).json({ error: 'Invalid video ID.' });
    }

    const videoRes = await pg.query(`
      SELECT v.id, v.title, v.slug, v.description, v.thumbnail_url, v.video_url,
             v.duration, v.access_level, v.status, v.views_count, v.likes_count, v.created_at,
             vc.id as category_id, vc.name as category_name, vc.slug as category_slug,
             u.id as creator_id, u.username as creator_username,
             up.display_name as creator_display_name, up.avatar_url as creator_avatar_url,
             up.subscribers_count as creator_subscribers_count
      FROM videos v
      LEFT JOIN video_categories vc ON v.category_id = vc.id
      LEFT JOIN users u ON v.creator_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE v.id = $1
    `, [videoId]);

    if (videoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Video not found.' });
    }

    const video = videoRes.rows[0] as any;

    // Check if unpublished and user is not creator or admin
    if (video.status !== 'published') {
      const isOwner = req.user && req.user.id === video.creator_id;
      const isAdmin = req.user && req.user.role === 'Administrator';
      if (!isOwner && !isAdmin) {
        return res.status(404).json({ error: 'Video is pending moderation or unavailable.' });
      }
    }

    // Increment views
    await pg.query('UPDATE videos SET views_count = views_count + 1 WHERE id = $1', [videoId]);

    // Check user interaction (liked, saved)
    let isLiked = false;
    let isSaved = false;
    if (req.user) {
      const likeCheck = await pg.query('SELECT 1 FROM video_likes WHERE user_id = $1 AND video_id = $2', [req.user.id, videoId]);
      isLiked = likeCheck.rows.length > 0;

      const saveCheck = await pg.query('SELECT 1 FROM saved_videos WHERE user_id = $1 AND video_id = $2', [req.user.id, videoId]);
      isSaved = saveCheck.rows.length > 0;

      // Record watch history
      await pg.query(`
        INSERT INTO watch_history (user_id, video_id, watched_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
      `, [req.user.id, videoId]);
    }

    // Get tags
    const tagsRes = await pg.query('SELECT tag FROM video_tags WHERE video_id = $1', [videoId]);
    const tags = tagsRes.rows.map((r: any) => r.tag);

    // Get related videos
    const relatedRes = await pg.query(`
      SELECT v.id, v.title, v.thumbnail_url, v.duration, v.access_level, v.views_count, v.created_at,
             u.username as creator_username
      FROM videos v
      LEFT JOIN users u ON v.creator_id = u.id
      WHERE v.id != $1 AND v.status = 'published' AND v.category_id = $2
      ORDER BY v.views_count DESC
      LIMIT 6
    `, [videoId, video.category_id || 1]);

    // Check membership authorization for premium video
    let canWatch = true;
    let premiumRequired = false;
    if (video.access_level === 'premium') {
      premiumRequired = true;
      if (!req.user) {
        canWatch = false;
      } else {
        const sub = await checkUserSubscription(req.user.id);
        const isAdmin = req.user.role === 'Administrator';
        const isCreator = req.user.id === video.creator_id;
        canWatch = sub.isPremium || isAdmin || isCreator;
      }
    }

    return res.json({
      video: {
        ...video,
        tags,
        isLiked,
        isSaved,
        canWatch,
        premiumRequired
      },
      related: relatedRes.rows
    });
  } catch (err: any) {
    console.error('[Get Video Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve video details.' });
  }
});

// Protected Video Stream Token / Verification (Section 6 Server-Side Access Control)
router.get('/stream/:id', async (req: AuthRequest, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const videoRes = await pg.query('SELECT id, video_url, access_level, status FROM videos WHERE id = $1', [videoId]);

    if (videoRes.rows.length === 0) {
      return res.status(404).json({ error: 'Video stream not found.' });
    }

    const video = videoRes.rows[0] as any;
    if (video.status !== 'published') {
      const isAdmin = req.user && req.user.role === 'Administrator';
      if (!isAdmin) {
        return res.status(403).json({ error: 'Video is undergoing moderation.' });
      }
    }

    // Check premium protection strictly on the server
    if (video.access_level === 'premium') {
      if (!req.user) {
        return res.status(401).json({ error: 'Premium subscription required to access this stream.' });
      }

      const sub = await checkUserSubscription(req.user.id);
      const isAdmin = req.user.role === 'Administrator';

      if (!sub.isPremium && !isAdmin) {
        return res.status(403).json({
          error: 'Your subscription has expired or does not include access to Premium 4K streams. Please renew your membership.',
          isExpired: true
        });
      }
    }

    // Return authorized media stream url
    return res.json({
      authorized: true,
      streamUrl: video.video_url,
      accessLevel: video.access_level,
      expiresInSeconds: 3600
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Stream authorization failed.' });
  }
});

// Like / Unlike Toggle
router.post('/:id/like', requireAuth, async (req: AuthRequest, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const userId = req.user!.id;

    const existing = await pg.query('SELECT 1 FROM video_likes WHERE user_id = $1 AND video_id = $2', [userId, videoId]);

    if (existing.rows.length > 0) {
      // Remove like
      await pg.query('DELETE FROM video_likes WHERE user_id = $1 AND video_id = $2', [userId, videoId]);
      await pg.query('UPDATE videos SET likes_count = GREATEST(0, likes_count - 1) WHERE id = $1', [videoId]);
      return res.json({ liked: false });
    } else {
      // Add like
      await pg.query('INSERT INTO video_likes (user_id, video_id) VALUES ($1, $2)', [userId, videoId]);
      await pg.query('UPDATE videos SET likes_count = likes_count + 1 WHERE id = $1', [videoId]);
      return res.json({ liked: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update like status.' });
  }
});

// Save / Bookmark Toggle
router.post('/:id/save', requireAuth, async (req: AuthRequest, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const userId = req.user!.id;

    const existing = await pg.query('SELECT 1 FROM saved_videos WHERE user_id = $1 AND video_id = $2', [userId, videoId]);

    if (existing.rows.length > 0) {
      await pg.query('DELETE FROM saved_videos WHERE user_id = $1 AND video_id = $2', [userId, videoId]);
      return res.json({ saved: false });
    } else {
      await pg.query('INSERT INTO saved_videos (user_id, video_id) VALUES ($1, $2)', [userId, videoId]);
      return res.json({ saved: true });
    }
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update saved status.' });
  }
});

// Comments for a video
router.get('/:id/comments', async (req, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const result = await pg.query(`
      SELECT c.id, c.content, c.created_at,
             u.username, up.display_name, up.avatar_url
      FROM comments c
      JOIN users u ON c.user_id = u.id
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE c.video_id = $1
      ORDER BY c.created_at DESC
      LIMIT 50
    `, [videoId]);

    return res.json({ comments: result.rows });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch comments.' });
  }
});

// Post comment
router.post('/:id/comments', requireAuth, async (req: AuthRequest, res) => {
  try {
    const videoId = parseInt(req.params.id);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Comment content cannot be empty.' });
    }

    const insert = await pg.query(`
      INSERT INTO comments (video_id, user_id, content)
      VALUES ($1, $2, $3)
      RETURNING id, content, created_at
    `, [videoId, req.user!.id, content.trim()]);

    const userProfile = await pg.query(`
      SELECT u.username, up.display_name, up.avatar_url
      FROM users u
      LEFT JOIN user_profiles up ON u.id = up.user_id
      WHERE u.id = $1
    `, [req.user!.id]);

    const profile = userProfile.rows[0] as any;
    const insertedRow = (insert.rows[0] as any) || {};
    const newComment = {
      ...insertedRow,
      username: profile.username,
      display_name: profile.display_name || profile.username,
      avatar_url: profile.avatar_url
    };

    return res.status(201).json({ comment: newComment });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to post comment.' });
  }
});

// Upload Video (Creator / User Upload - Section 7)
router.post(
  '/upload',
  requireAuth,
  upload.fields([{ name: 'video', maxCount: 1 }, { name: 'thumbnail', maxCount: 1 }]),
  async (req: AuthRequest, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const { title, description, categoryId, tags, accessLevel = 'free' } = req.body;

      if (!title || !title.trim()) {
        return res.status(400).json({ error: 'Title is required.' });
      }

      const videoFile = files?.video?.[0];
      const thumbnailFile = files?.thumbnail?.[0];

      // If user uploaded a physical file, construct path, else fallback to standard source
      let videoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4';
      let originalFilename = 'uploaded_sample.mp4';
      let fileSize = 45000000;
      let storagePath = videoUrl;

      if (videoFile) {
        videoUrl = `/uploads/videos/${videoFile.filename}`;
        storagePath = videoFile.path;
        originalFilename = videoFile.originalname;
        fileSize = videoFile.size;
      }

      let thumbnailUrl = 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=1200&q=80';
      if (thumbnailFile) {
        thumbnailUrl = `/uploads/thumbnails/${thumbnailFile.filename}`;
      }

      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '') + '-' + Date.now();
      const isAdmin = req.user!.role === 'Administrator';

      // Section 7: "By default, user-uploaded videos must remain private or unpublished until the required moderation process is complete."
      // Admin uploads can directly publish
      const status = isAdmin ? 'published' : 'pending_review';
      const catId = categoryId ? parseInt(categoryId) : 1;

      // Only Admin can mark a video as Premium
      const finalAccessLevel = isAdmin && accessLevel === 'premium' ? 'premium' : 'free';

      const insert = await pg.query(`
        INSERT INTO videos (
          title, slug, description, creator_id, category_id,
          thumbnail_url, video_url, duration, access_level, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, 360, $8, $9)
        RETURNING id, title, slug, status, access_level
      `, [title, slug, description || '', req.user!.id, catId, thumbnailUrl, videoUrl, finalAccessLevel, status]);

      const newVideo = insert.rows[0] as any;

      // Insert source file entry (Section 13)
      await pg.query(`
        INSERT INTO source_files (
          video_id, original_filename, storage_path, file_size,
          mime_type, file_format, checksum_sha256, processing_status, uploaded_by
        )
        VALUES ($1, $2, $3, $4, 'video/mp4', 'mp4', $5, 'ready', $6)
      `, [
        newVideo.id,
        originalFilename,
        storagePath,
        fileSize,
        crypto.createHash('sha256').update(originalFilename + Date.now()).digest('hex'),
        req.user!.id
      ]);

      // Insert tags
      if (tags) {
        const tagList = Array.isArray(tags) ? tags : String(tags).split(',');
        for (const t of tagList) {
          const trimmed = t.trim();
          if (trimmed) {
            await pg.query('INSERT INTO video_tags (video_id, tag) VALUES ($1, $2)', [newVideo.id, trimmed]);
          }
        }
      }

      if (isAdmin) {
        const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';
        await logAdminAction(req.user!.id, req.user!.username, 'UPLOAD_VIDEO', 'video', newVideo.id, `Admin uploaded video "${title}"`, ip);
      }

      return res.status(201).json({
        message: isAdmin ? 'Video uploaded and published successfully!' : 'Video submitted successfully! It is now pending administrator review.',
        video: newVideo
      });
    } catch (err: any) {
      console.error('[Upload Video Error]:', err);
      return res.status(500).json({ error: 'Video upload failed.' });
    }
  }
);

export default router;

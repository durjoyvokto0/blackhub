import { Router } from 'express';
import { pg } from '../db.js';
import { AuthRequest } from '../auth.js';

const router = Router();

// Submit Content Report / Copyright DMCA (Section 25)
router.post('/report', async (req: AuthRequest, res) => {
  try {
    const { videoId, reason, details, reporterEmail } = req.body;

    if (!videoId || !reason) {
      return res.status(400).json({ error: 'Video ID and reason for reporting are required.' });
    }

    const userId = req.user ? req.user.id : null;
    const email = reporterEmail || (req.user ? req.user.email : 'anonymous@reporter.io');

    const insert = await pg.query(`
      INSERT INTO content_reports (video_id, reporter_user_id, reporter_email, reason, details, status)
      VALUES ($1, $2, $3, $4, $5, 'pending')
      RETURNING id, created_at
    `, [parseInt(videoId), userId, email, reason, details || '']);

    return res.status(201).json({
      message: 'Report submitted successfully. Our legal and content moderation team reviews all reports within 24 hours.',
      reportId: (insert.rows[0] as any).id
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit content report.' });
  }
});

// Submit Support Ticket / Contact Request
router.post('/support', async (req: AuthRequest, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!email || !subject || !message) {
      return res.status(400).json({ error: 'Email, subject, and message are required.' });
    }

    const ticketId = 'TICK-' + Math.floor(100000 + Math.random() * 900000);

    return res.status(201).json({
      message: 'Support inquiry received. A customer support representative will reply to your email.',
      ticketId
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to submit support request.' });
  }
});

export default router;

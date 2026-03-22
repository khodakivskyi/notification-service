import express, { Request, Response, NextFunction } from 'express';
import emailService from '../services/emailService';
import emailQueue from '../queues/emailQueue';
import { ANONYMOUS_USER_ID } from '../constants';
import validate from '../middleware/validate';
import {
  sendNotification,
  uuidParam,
  userIdParam,
} from '../schemas/notificationSchemas';

const router = express.Router();

/**
 * POST /api/notifications/send
 * Send notification email to user
 */
router.post(
  '/send',
  validate(sendNotification),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { email, subject, htmlContent, userId, callbackUrl } = req.body;

      const notification = await emailService.createNotification({
        userId: userId || ANONYMOUS_USER_ID,
        channel: email,
        subject: subject,
        content: htmlContent,
        metadata: {
          callbackUrl: callbackUrl || null,
        },
      });

      await emailQueue.addNotificationEmail({
        to: email,
        subject,
        htmlContent: htmlContent,
        userId,
        notificationId: notification.id,
        callbackUrl: callbackUrl || null,
      });

      res.status(202).json({
        success: true,
        message: 'Notification queued for delivery',
        notificationId: notification.id,
        statusUrl: `/api/notifications/${notification.id}`,
      });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/notifications/:id
 * Get notification by ID
 */
router.get('/:id', validate(uuidParam), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notification = await emailService.getById(id);

    res.status(200).json({ success: true, data: notification });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/user/:userId/stats
 * Get notification statistics for a user
 */
router.get(
  '/user/:userId/stats',
  validate(userIdParam),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const stats = await emailService.getStatsByUserId(userId);

      res.status(200).json({ success: true, data: stats });
    } catch (error) {
      next(error);
    }
  },
);

/**
 * GET /api/notifications/queue/stats
 * Get email queue statistics
 */
router.get('/queue/stats', async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const stats = await emailQueue.getStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
});

export default router;

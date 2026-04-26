import express, { Request, Response, NextFunction } from 'express';
import notificationService from '../services/notificationService.js';
import emailQueue from '../queues/emailQueue.js';
import { ANONYMOUS_USER_ID } from '../constants/index.js';
import validate from '../middleware/validate.js';
import {
  sendNotification,
  uuidParam,
  userIdParam,
} from '../schemas/notificationSchemas.js';

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

      const notification = await notificationService.createNotification({
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
router.get('/:id', validate(uuidParam, 'params'), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const notification = await notificationService.getById(id);

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
  validate(userIdParam, 'params'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = Array.isArray(req.params.userId) ? req.params.userId[0] : req.params.userId;
      const stats = await notificationService.getStatsByUserId(userId);

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

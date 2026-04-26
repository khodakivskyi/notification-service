import db from '../config/database.js';
import logger from '../config/logger.js';
import { NOTIFICATION_STATUSES } from '../constants/index.js';
import { getErrorMessage } from '../helpers/index.js';
import { Notification, CreateNotificationInput, NotificationStats } from '../types/notification.js';

class NotificationRepository {
  /**
   * Create a new notification record
   * @param notification - Notification data
   * @returns Created notification record
   */
  async create({
    userId,
    channel,
    subject,
    content,
    metadata = {},
  }: CreateNotificationInput): Promise<Notification> {
    try {
      const result = await db.query<Notification>(
        `INSERT INTO notifications
                     ("userId", channel, subject, content, metadata)
                 VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [userId, channel, subject, content, metadata],
      );

      logger.info('Notification record created', {
        id: result.rows[0].id,
        channel,
      });

      return result.rows[0];
    } catch (error: unknown) {
      logger.error('Error creating notification record', { error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Update status. For SENDING, performs an atomic claim (only if current status is QUEUED or RETRYING)
   * and returns whether this process claimed it; otherwise just updates.
   * @param id - Notification ID
   * @param statusId - Status ID
   * @param errorMessage - Optional error message (for FAILED)
   * @returns When statusId is SENDING, returns true if claimed, false otherwise; else undefined
   */
  async updateStatus(
    id: string,
    statusId: number,
    errorMessage: string | null = null,
  ): Promise<boolean | void> {
    if (statusId === NOTIFICATION_STATUSES.SENDING) {
      try {
        const result = await db.query<{ id: string }>(
          `UPDATE notifications
                     SET "statusId"     = $2,
                         "errorMessage" = NULL
                     WHERE id = $1
                       AND "statusId" IN ($3, $4) RETURNING id`,
          [
            id,
            NOTIFICATION_STATUSES.SENDING,
            NOTIFICATION_STATUSES.QUEUED,
            NOTIFICATION_STATUSES.RETRYING,
          ],
        );
        const claimed = (result.rowCount || 0) > 0;
        if (claimed) {
          logger.info('Notification claimed for processing', { id });
        }
        return claimed;
      } catch (error: unknown) {
        logger.error('Error claiming notification for processing', { id, error: getErrorMessage(error) });
        throw error;
      }
    } else {
      try {
        // If status is not FAILED, clear error message; if FAILED and errorMessage provided, set it
        const updates: string[] = ['"statusId" = $2'];
        const params: unknown[] = [id, statusId];

        if (statusId === NOTIFICATION_STATUSES.FAILED && errorMessage !== null) {
          updates.push('"errorMessage" = $3');
          params.push(errorMessage);
        } else if (statusId !== NOTIFICATION_STATUSES.FAILED) {
          // Non-FAILED status - clear error message
          updates.push('"errorMessage" = NULL');
        }

        await db.query(
          `UPDATE notifications
                     SET ${updates.join(', ')}
                     WHERE id = $1`,
          params,
        );

        logger.info('Notification status updated', {
          id,
          statusId,
          hasError: errorMessage !== null,
        });
      } catch (error: unknown) {
        logger.error('Error updating notification status', { id, statusId, error: getErrorMessage(error) });
        throw error;
      }
    }
  }

  /**
   * Get all user messages
   * @param userId - User ID
   * @param limit - Maximum number of records
   * @param offset - Number of records to skip
   * @returns Array of notifications
   */
  async getByUserId(
    userId: string,
    limit: number = 50,
    offset: number = 0,
  ): Promise<Notification[]> {
    try {
      const result = await db.query<Notification>(
        `SELECT *
                 FROM notifications
                 WHERE "userId" = $1
                 ORDER BY "createdAt" DESC
                     LIMIT $2
                 OFFSET $3`,
        [userId, limit, offset],
      );

      return result.rows;
    } catch (error: unknown) {
      logger.error('Error fetching notifications by user ID', { userId, error: getErrorMessage(error) });
      throw error;
    }
  }

  /**
   * Get message by ID with status name
   * @param id - Notification ID
   * @returns Notification or null if not found
   */
  async getById(id: string): Promise<Notification | null> {
    try {
      const result = await db.query<Notification & { status?: string }>(
        `SELECT n.*, ns.name as status
                 FROM notifications n
                          LEFT JOIN notification_statuses ns ON n."statusId" = ns.id
                 WHERE n.id = $1`,
        [id],
      );

      return result.rows[0] || null;
    } catch (err: any) {
      logger.error('Failed to fetch notification', {
        id,
        error: err.message,
      });
      throw err;
    }
  }

  /**
   * Get statistics for the user
   * @param userId - User ID
   * @returns Array of statistics
   */
  async getStatsByUserId(userId: string): Promise<NotificationStats[]> {
    try {
      const result = await db.query<NotificationStats>(
        `SELECT ns.name as status,
                        COUNT(*) ::int as count
                 FROM notifications n
                     LEFT JOIN notification_statuses ns
                 ON n."statusId" = ns.id
                 WHERE n."userId" = $1
                 GROUP BY, ns.name`,
        [userId],
      );

      return result.rows;
    } catch (error: unknown) {
      logger.error('Failed to fetch notification stats', {
        userId,
        error: getErrorMessage(error),
      });
      throw error;
    }
  }

  /**
   * Delete notifications older than specified days
   * @param days - Number of days
   * @returns Number of deleted records
   */
  /*
    async deleteOlderThan(days: number = 90): Promise<number> {
        try {
            const result = await db.query(
                `DELETE
                 FROM notifications
                 WHERE "createdAt" < NOW() - MAKE_INTERVAL(days = > $1)`,
                [days]
            );

            logger.info('Old notifications deleted', {days, deletedCount: result.rowCount});
            return result.rowCount || 0;
        } catch (error: any) {
            logger.error('Error deleting old notifications', {error: error.message});
            throw error;
        }
    }*/
}

// Export as singleton
export default new NotificationRepository();

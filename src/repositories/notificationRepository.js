const db = require("../config/database");
const logger = require("../config/logger");

/**
 * @typedef {import('../types/notification').Notification} Notification
 * @typedef {import('../types/notification').CreateNotificationInput} CreateNotificationInput
 * @typedef {import('../types/notification').NotificationStats} NotificationStats
 */

class NotificationRepository {
    /**
     * Create a new notification record
     * @param {CreateNotificationInput} notification - Notification data
     * @returns {Promise<Notification>} - Created notification record
     */
    async create({userId, type, channel, subject, content, metadata = {}}) {
        try {
            const result = await db.query(
                `INSERT INTO notifications
                     ("userId", "type", channel, subject, content, metadata, status)
                 VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
                [userId, type, channel, subject, content, metadata]
            );

            logger.info('Notification record created', {
                id: result.rows[0].id,
                type,
                channel
            });

            return result.rows[0];
        } catch (error) {
            logger.error("Error creating notification record", {error: error.message});
            throw error;
        }
    }

    /**
     * Update status to 'sent'
     * @param {string} id - Notification ID
     * @returns {Promise<void>}
     */
    async markAsSent(id) {
        try {
            await db.query(
                `UPDATE notifications
                 SET status = 'sent',
                     "sentAt" = CURRENT_TIMESTAMP
                 WHERE id = $1`,
                [id]
            );

            logger.info('Notification marked as sent', {id});
        } catch (error) {
            logger.error("Error marking notification as sent", {id, error: error.message});
            throw error;
        }
    }

    /**
     * Update status to 'failed'
     * @param {string} id - Notification ID
     * @param {string} errorMessage - Error message
     * @returns {Promise<void>}
     */
    async markAsFailed(id, errorMessage) {
        try {
            await db.query(
                `UPDATE notifications
                 SET status = 'failed',
                     "errorMessage" = $2,
                     "retryCount" = "retryCount" + 1
                 WHERE id = $1`,
                [id, errorMessage]
            );

            logger.info('Notification marked as failed', {id, errorMessage});
        } catch (error) {
            logger.error("Error marking notification as failed", {id, error: error.message});
            throw error;
        }
    }

    /**
     * Get all user messages
     * @param {string} userId - User ID
     * @param {number} [limit=50] - Maximum number of records
     * @param {number} [offset=0] - Number of records to skip
     * @returns {Promise<Notification[]>} - Array of notifications
     */
    async getByUserId(userId, limit = 50, offset = 0) {
        try {
            const result = await db.query(
                `SELECT *
                 FROM notifications
                 WHERE "userId" = $1
                 ORDER BY "createdAt" DESC
                     LIMIT $2
                 OFFSET $3`,
                [userId, limit, offset]
            );

            return result.rows;
        } catch (error) {
            logger.error("Error fetching notifications by user ID", {userId, error: error.message});
            throw error;
        }
    }

    /**
     * Get message by ID
     * @param {string} id - Notification ID
     * @returns {Promise<Notification|null>} - Notification or null if not found
     */
    async getById(id) {
        try {
            const result = await db.query(
                `SELECT *
                 FROM notifications
                 WHERE id = $1`,
                [id]
            );

            return result.rows[0] || null;
        } catch (err) {
            logger.error('Failed to fetch notification', {
                id,
                error: err.message
            });
            throw err;
        }
    }

    /**
     * Get statistics for the user
     * @param {string} userId - User ID
     * @returns {Promise<NotificationStats[]>} - Array of statistics
     */
    async getStatsByUserId(userId) {
        try {
            const result = await db.query(
                `SELECT "type",
                        status,
                        COUNT(*) as count
                 FROM notifications
                 WHERE "userId" = $1
                 GROUP BY "type", status`,
                [userId]
            );

            return result.rows;
        } catch (err) {
            logger.error('Failed to fetch notification stats', {
                userId,
                error: err.message
            });
            throw err;
        }
    }

    /**
     * Get message with status 'pending' for retry
     * @param {number} [limit=100] - Maximum number of records
     * @returns {Promise<Notification[]>} - Array of pending notifications
     */
    async getPendingNotifications(limit = 100) {
        try {
            const result = await db.query(
                `SELECT *
                 FROM notifications
                 WHERE status = 'pending'
                 ORDER BY "createdAt" ASC
                     LIMIT $1`,
                [limit]
            );

            return result.rows;
        } catch (error) {
            logger.error("Error fetching pending notifications", {error: error.message});
            throw error;
        }
    }

    /**
     * Delete notifications older than specified days
     * @param {number} [days=90] - Number of days
     * @returns {Promise<number>} - Number of deleted records
     */
    async deleteOlderThan(days = 90) {
        try {
            const result = await db.query(
                `DELETE
                 FROM notifications
                 WHERE "createdAt" < NOW() - MAKE_INTERVAL(days => $1)`,
                [days]
            );

            logger.info('Old notifications deleted', {days, deletedCount: result.rowCount});
            return result.rowCount;
        } catch (error) {
            logger.error("Error deleting old notifications", {error: error.message});
            throw error;
        }
    }
}

module.exports = new NotificationRepository();
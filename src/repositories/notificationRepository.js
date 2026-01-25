const db = require("../config/database");
const logger = require("../config/logger");
const {NOTIFICATION_STATUSES} = require("../constants/index");

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
                     ("userId", "type", channel, subject, content, metadata)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
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
     * Update status. For SENDING, performs an atomic claim (only if current status is QUEUED or RETRYING)
     * and returns whether this process claimed it; otherwise just updates.
     * @param {string} id - Notification ID
     * @param {number} statusId - Status ID
     * @param {string|null} errorMessage - Optional error message (for FAILED)
     * @returns {Promise<boolean|void>} - When statusId is SENDING, returns true if claimed, false otherwise; else undefined
     */
    async updateStatus(id, statusId, errorMessage = null) {
        if (statusId === NOTIFICATION_STATUSES.SENDING) {
            try {
                const result = await db.query(
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
                    ]
                );
                const claimed = result.rowCount > 0;
                if (claimed) {
                    logger.info("Notification claimed for processing", {id});
                }
                return claimed;
            } catch (error) {
                logger.error("Error claiming notification for processing", {id, error: error.message});
                throw error;
            }
        } else {
            try {
                // If status is not FAILED, clear error message; if FAILED and errorMessage provided, set it
                const updates = ['"statusId" = $2'];
                const params = [id, statusId];

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
                    params
                );

                logger.info("Notification status updated", {id, statusId, hasError: errorMessage !== null});
            } catch (error) {
                logger.error("Error updating notification status", {id, statusId, error: error.message});
                throw error;
            }
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
     * Get message by ID with status name
     * @param {string} id - Notification ID
     * @returns {Promise<Notification|null>} - Notification or null if not found
     */
    async getById(id) {
        try {
            const result = await db.query(
                `SELECT n.*, ns.name as status
                 FROM notifications n
                          LEFT JOIN notification_statuses ns ON n."statusId" = ns.id
                 WHERE n.id = $1`,
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
                `SELECT n."type",
                        ns.name as status,
                        COUNT(*) as count
                 FROM notifications n
                 LEFT JOIN notification_statuses ns ON n."statusId" = ns.id
                 WHERE n."userId" = $1
                 GROUP BY n."type", ns.name`,
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
     * Get message with status 'queued' or 'retrying' for retry
     * @param {number} [limit=100] - Maximum number of records
     * @returns {Promise<Notification[]>} - Array of pending notifications
     */
    async getPendingNotifications(limit = 100) {
        try {
            const result = await db.query(
                `SELECT n.*
                 FROM notifications n
                 LEFT JOIN notification_statuses ns ON n."statusId" = ns.id
                 WHERE ns.name IN ('queued', 'retrying')
                 ORDER BY n."createdAt" ASC
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
/**
 * @typedef {Object} Notification
 * @property {string} id - Notification UUID (primary key)
 * @property {string} userId - User UUID (foreign key)
 * @property {'email'|'websocket'|'push'} type - Notification type
 * @property {string} channel - Delivery channel (email address or websocket connection ID)
 * @property {string} subject - Notification subject (for email)
 * @property {string|null} content - Notification content/text
 * @property {'pending'|'sent'|'failed'} status - Notification status
 * @property {string|null} errorMessage - Error message if status is 'failed'
 * @property {number} retryCount - Number of retry attempts
 * @property {Object} metadata - Additional metadata (JSON object)
 * @property {Date} createdAt - Creation timestamp
 * @property {Date} updatedAt - Last update timestamp
 * @property {Date|null} sentAt - Sent timestamp (null if not sent yet)
 */

/**
 * @typedef {Object} CreateNotificationInput
 * @property {string} userId - User UUID
 * @property {'email'|'websocket'|'push'} type - Notification type
 * @property {string} channel - Delivery channel
 * @property {string} subject - Notification subject
 * @property {string|null} [content] - Notification content (optional)
 * @property {Object} [metadata] - Additional metadata (optional, defaults to {})
 */

/**
 * @typedef {Object} NotificationStats
 * @property {'email'|'websocket'|'push'} type - Notification type
 * @property {'pending'|'sent'|'failed'} status - Notification status
 * @property {number} count - Count of notifications
 */

module.exports = {};

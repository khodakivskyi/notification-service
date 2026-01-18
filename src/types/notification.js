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
 * @property {string|Date} createdAt - Creation timestamp (ISO string from DB, can be converted to Date)
 * @property {string|Date} updatedAt - Last update timestamp (ISO string from DB, can be converted to Date)
 * @property {string|Date|null} sentAt - Sent timestamp (ISO string from DB or null if not sent yet)
 * @note Database returns timestamps as ISO strings. Convert to Date if needed: new Date(notification.createdAt)
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

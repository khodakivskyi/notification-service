/**
 * Notification Status IDs
 */
const NOTIFICATION_STATUSES = {
    QUEUED: 1,    // 'queued'
    SENDING: 2,   // 'sending'
    SENT: 3,      // 'sent'
    FAILED: 4,    // 'failed'
    RETRYING: 5,  // 'retrying'
};

function isValidStatusId(id) {
    return Object.values(NOTIFICATION_STATUSES).includes(id);
}

module.exports = {
    NOTIFICATION_STATUSES,
    isValidStatusId,
};
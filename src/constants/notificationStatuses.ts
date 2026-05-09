/**
 * Notification Status IDs
 */
export const NOTIFICATION_STATUSES = {
  QUEUED: 1, // 'queued'
  SENDING: 2, // 'sending'
  SENT: 3, // 'sent'
  FAILED: 4, // 'failed'
  RETRYING: 5, // 'retrying'
} as const;

export type NotificationStatusId =
  (typeof NOTIFICATION_STATUSES)[keyof typeof NOTIFICATION_STATUSES];

/**
 * Check if status ID is valid
 * @param id - Status ID to validate
 * @returns true if valid status ID
 */
export function isValidStatusId(id: number): id is NotificationStatusId {
  return Object.values(NOTIFICATION_STATUSES).includes(id as NotificationStatusId);
}

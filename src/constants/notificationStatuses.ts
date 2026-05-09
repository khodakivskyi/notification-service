/**
 * Notification Status IDs
 */
export const NOTIFICATION_STATUSES = {
  QUEUED: 1,
  SENDING: 2,
  SENT: 3,
  FAILED: 4,
  RETRYING: 5,
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

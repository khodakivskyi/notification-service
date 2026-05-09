/**
 * Notification type definition
 */
export interface Notification {
  id: string; // UUID
  userId: string; // UUID
  channel: string; // email address or websocket connection ID
  subject: string;
  content: string | null;
  statusId: number; // Foreign key to notification_statuses
  status?: string; // Status name from JOIN (optional, present when fetched with JOIN)
  errorMessage: string | null;
  retryCount: number;
  metadata: Record<string, unknown>; // JSON object
  createdAt: Date | string; // ISO string from DB, can be converted to Date
  updatedAt: Date | string; // ISO string from DB, can be converted to Date
  sentAt: Date | string | null; // ISO string from DB or null if not sent yet
}

/**
 * Input for creating a new notification
 */
export interface CreateNotificationInput {
  userId: string; // UUID
  channel: string;
  subject: string;
  content?: string | null; // Optional
  metadata?: Record<string, unknown>; // Optional, defaults to {}
}

/**
 * Notification statistics by type and status
 */
export interface NotificationStats {
  status: string; // Status name from JOIN
  count: number; // Count of notifications
}

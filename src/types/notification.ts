/**
 * Notification type definition
 */
export interface Notification {
  id: string; // UUID
  userId: string; // UUID
  type: 'email' | 'websocket' | 'push';
  channel: string; // email address or websocket connection ID
  subject: string;
  content: string | null;
  statusId: number; // Foreign key to notification_statuses
  status?: string; // Status name from JOIN (optional, present when fetched with JOIN)
  errorMessage: string | null;
  retryCount: number;
  metadata: Record<string, any>; // JSON object
  createdAt: Date | string; // ISO string from DB, can be converted to Date
  updatedAt: Date | string; // ISO string from DB, can be converted to Date
  sentAt: Date | string | null; // ISO string from DB or null if not sent yet
}

/**
 * Notification Status type
 */
export interface NotificationStatus {
  id: number; // Primary key
  name: string; // Status name (unique)
}

/**
 * Input for creating a new notification
 */
export interface CreateNotificationInput {
  userId: string; // UUID
  type: 'email' | 'websocket' | 'push';
  channel: string;
  subject: string;
  content?: string | null; // Optional
  metadata?: Record<string, any>; // Optional, defaults to {}
}

/**
 * Notification statistics by type and status
 */
export interface NotificationStats {
  type: 'email' | 'websocket' | 'push';
  status: string; // Status name from JOIN
  count: number; // Count of notifications
}

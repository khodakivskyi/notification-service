import type { NotificationStatusId } from '../constants/notificationStatuses.js';
import type { Notification, CreateNotificationInput, NotificationStats } from '../types/notification.js';

export interface INotificationRepository {
  create(input: CreateNotificationInput): Promise<Notification>;
  updateStatus(id: string, statusId: NotificationStatusId, errorMessage?: string | null): Promise<boolean | void>;
  getByUserId(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
  getById(id: string): Promise<Notification | null>;
  getStatsByUserId(userId: string): Promise<NotificationStats[]>;
}

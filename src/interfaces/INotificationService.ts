import type { NotificationStatusId } from '../constants/notificationStatuses.js';
import type { Notification, CreateNotificationInput, NotificationStats } from '../types/notification.js';

export interface INotificationService {
  createNotification(input: CreateNotificationInput): Promise<Notification>;
  updateStatus(id: string, statusId: NotificationStatusId, errorMessage?: string | null): Promise<boolean | void>;
  getById(id: string, userId?: string | null): Promise<Notification>;
  getStatsByUserId(id: string): Promise<NotificationStats[]>;
}

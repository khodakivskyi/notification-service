import { isValidStatusId } from '../constants/index.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../exceptions/index.js';
import { validateEmail } from '../helpers/index.js';
import { Notification, CreateNotificationInput, NotificationStats } from '../types/notification.js';
import type { INotificationRepository } from '../interfaces/INotificationRepository.js';
import type { INotificationService } from '../interfaces/INotificationService.js';

export class NotificationService implements INotificationService {
  constructor(private readonly repository: INotificationRepository) {}

  async createNotification({
    userId,
    channel,
    subject,
    content,
    metadata = {},
  }: CreateNotificationInput): Promise<Notification> {
    if (channel) {
      validateEmail(channel);
    }

    return await this.repository.create({
      userId,
      channel,
      subject,
      content: content || null,
      metadata,
    });
  }

  async updateStatus(
    id: string,
    statusId: number,
    errorMessage: string | null = null,
  ): Promise<boolean | void> {
    if (!isValidStatusId(statusId)) {
      throw new NotFoundError('Status', statusId.toString());
    }

    return this.repository.updateStatus(id, statusId, errorMessage);
  }

  async getById(id: string, userId: string | null = null): Promise<Notification> {
    if (!id) {
      throw new ValidationError('Notification ID is required');
    }

    const notification = await this.repository.getById(id);

    if (!notification) {
      throw new NotFoundError('Notification', id);
    }

    if (userId && notification.userId !== userId) {
      throw new ForbiddenError();
    }

    return notification;
  }

  async getStatsByUserId(id: string): Promise<NotificationStats[]> {
    if (!id) {
      throw new ValidationError('User ID is required');
    }

    const stats = await this.repository.getStatsByUserId(id);
    return stats || [];
  }
}

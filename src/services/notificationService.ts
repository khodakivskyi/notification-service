import notificationRepository from '../repositories/notificationRepository.js';
import { isValidStatusId } from '../constants/index.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../exceptions/index.js';
import { validateEmail } from '../helpers/index.js';
import { Notification, CreateNotificationInput, NotificationStats } from '../types/notification.js';

class NotificationService {
  /**
   * Create a new notification record
   * @param data - Notification data
   * @returns Created notification
   */
  async createNotification({
    userId,
    channel,
    subject,
    content,
    metadata = {},
  }: CreateNotificationInput): Promise<Notification> {
    // Validate email format if channel is email
    // channel property is delivery address (email)
    if (channel) {
      validateEmail(channel);
    }

    return await notificationRepository.create({
      userId,
      channel,
      subject,
      content: content || null,
      metadata,
    });
  }

  /**
   * Update notification status
   * @param id - Notification ID
   * @param statusId - Status ID
   * @param errorMessage - Optional error message (for FAILED)
   * @returns When statusId is SENDING, returns true if claimed, false otherwise; else undefined
   */
  async updateStatus(
    id: string,
    statusId: number,
    errorMessage: string | null = null,
  ): Promise<boolean | void> {
    if (!isValidStatusId(statusId)) {
      throw new NotFoundError('Status', statusId.toString());
    }

    return notificationRepository.updateStatus(id, statusId, errorMessage);
  }

  /**
   * Get notification by ID
   * @param id - Notification ID
   * @param userId - Optional user ID for access control
   * @returns Notification
   * @throws {NotFoundError} If notification not found
   * @throws {ForbiddenError} If user is not authorized to access the notification
   */
  async getById(id: string, userId: string | null = null): Promise<Notification> {
    if (!id) {
      throw new ValidationError('Notification ID is required');
    }

    const notification = await notificationRepository.getById(id);

    if (!notification) {
      throw new NotFoundError('Notification', id);
    }

    if (userId && notification.userId !== userId) {
      throw new ForbiddenError();
    }

    return notification;
  }

  /**
   * Get statistics for user
   * @param id - User ID
   * @returns Array of statistics
   */
  async getStatsByUserId(id: string): Promise<NotificationStats[]> {
    if (!id) {
      throw new ValidationError('User ID is required');
    }

    const stats = await notificationRepository.getStatsByUserId(id);
    return stats || [];
  }
}

export default new NotificationService();

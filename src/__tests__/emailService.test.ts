import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationService } from '../services/notificationService.js';
import type { INotificationRepository } from '../interfaces/INotificationRepository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../exceptions/index.js';
import { NOTIFICATION_STATUSES, type NotificationStatusId } from '../constants/index.js';

vi.mock('../config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

function createMockRepository(): INotificationRepository {
  return {
    create: vi.fn(),
    updateStatus: vi.fn(),
    getById: vi.fn(),
    getByUserId: vi.fn(),
    getStatsByUserId: vi.fn(),
  };
}

describe('notificationService', () => {
  let repository: INotificationRepository;
  let service: NotificationService;

  beforeEach(() => {
    vi.clearAllMocks();
    repository = createMockRepository();
    service = new NotificationService(repository);
  });

  describe('createNotification', () => {
    it('calls repository.create with correct args for valid email channel', async () => {
      const created = {
        id: 'notif-1',
        userId: 'user-1',
        type: 'email' as const,
        channel: 'a@b.com',
        subject: 'Subj',
        content: 'Body',
        statusId: 1,
        errorMessage: null,
        retryCount: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
      };

      vi.mocked(repository.create).mockResolvedValueOnce(created);

      const result = await service.createNotification({
        userId: 'user-1',
        channel: 'a@b.com',
        subject: 'Subj',
        content: 'Body',
        metadata: {},
      });

      expect(repository.create).toHaveBeenCalledWith({
        userId: 'user-1',
        channel: 'a@b.com',
        subject: 'Subj',
        content: 'Body',
        metadata: {},
      });
      expect(result).toEqual(created);
    });

    it('throws ValidationError for invalid email when type is email', async () => {
      await expect(
        service.createNotification({
          userId: 'user-1',
          channel: 'invalid-email',
          subject: 'S',
          content: 'C',
        }),
      ).rejects.toThrow(ValidationError);
      expect(repository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('calls repository.updateStatus for valid statusId', async () => {
      vi.mocked(repository.updateStatus).mockResolvedValueOnce(undefined);

      await service.updateStatus('id-1', NOTIFICATION_STATUSES.SENT);

      expect(repository.updateStatus).toHaveBeenCalledWith('id-1', NOTIFICATION_STATUSES.SENT, null);
    });

    it('throws NotFoundError for invalid statusId', async () => {
      await expect(service.updateStatus('id-1', 999 as NotificationStatusId)).rejects.toThrow(NotFoundError);
      expect(repository.updateStatus).not.toHaveBeenCalled();
    });
  });

  describe('getById', () => {
    it('returns notification when found and userId matches or is null', async () => {
      const notification = {
        id: 'id-1',
        userId: 'user-1',
        type: 'email' as const,
        channel: 'a@b.com',
        subject: 'S',
        content: 'C',
        statusId: 3,
        status: 'sent',
        errorMessage: null,
        retryCount: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: new Date(),
      };

      vi.mocked(repository.getById).mockResolvedValueOnce(notification);

      const result = await service.getById('id-1');

      expect(repository.getById).toHaveBeenCalledWith('id-1');
      expect(result).toEqual(notification);
    });

    it('throws ValidationError when id is empty', async () => {
      await expect(service.getById('')).rejects.toThrow(ValidationError);
      expect(repository.getById).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when notification not found', async () => {
      vi.mocked(repository.getById).mockResolvedValueOnce(null);

      await expect(service.getById('missing-id')).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when userId does not match notification userId', async () => {
      vi.mocked(repository.getById).mockResolvedValueOnce({
        id: 'id-1',
        userId: 'user-A',
        type: 'email',
        channel: 'a@b.com',
        subject: 'S',
        content: 'C',
        statusId: 3,
        errorMessage: null,
        retryCount: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
      } as any);

      await expect(service.getById('id-1', 'user-B')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getStatsByUserId', () => {
    it('returns stats from repository', async () => {
      const stats = [{ status: 'sent', count: 10 }];
      vi.mocked(repository.getStatsByUserId).mockResolvedValueOnce(stats);

      const result = await service.getStatsByUserId('user-1');

      expect(repository.getStatsByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(stats);
    });

    it('throws ValidationError when id is empty', async () => {
      await expect(service.getStatsByUserId('')).rejects.toThrow(ValidationError);
      expect(repository.getStatsByUserId).not.toHaveBeenCalled();
    });
  });
});

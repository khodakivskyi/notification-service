import { describe, it, expect, vi, beforeEach } from 'vitest';
import emailService from '../services/email/emailService';
import notificationRepository from '../repositories/notificationRepository';
import { NotFoundError, ValidationError, ForbiddenError } from '../exceptions';
import { NOTIFICATION_STATUSES } from '../constants/';

vi.mock('../config/env', () => ({
  default: {
    smtp: { host: 'localhost', port: 587, user: 'test@test.com', pass: 'pass' },
  },
}));

vi.mock('../config/logger', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../repositories/notificationRepository', () => ({
  default: {
    create: vi.fn(),
    updateStatus: vi.fn(),
    getById: vi.fn(),
    getStatsByUserId: vi.fn(),
  },
}));

const mockCreate = vi.mocked(notificationRepository.create);
const mockUpdateStatus = vi.mocked(notificationRepository.updateStatus);
const mockGetById = vi.mocked(notificationRepository.getById);
const mockGetStatsByUserId = vi.mocked(notificationRepository.getStatsByUserId);

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

      mockCreate.mockResolvedValueOnce(created);

      const result = await emailService.createNotification({
        userId: 'user-1',
        type: 'email',
        channel: 'a@b.com',
        subject: 'Subj',
        content: 'Body',
        metadata: {},
      });

      expect(mockCreate).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'email',
        channel: 'a@b.com',
        subject: 'Subj',
        content: 'Body',
        metadata: {},
      });
      expect(result).toEqual(created);
    });

    it('throws ValidationError for invalid email when type is email', async () => {
      await expect(
        emailService.createNotification({
          userId: 'user-1',
          type: 'email',
          channel: 'invalid-email',
          subject: 'S',
          content: 'C',
        }),
      ).rejects.toThrow(ValidationError);
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });

  describe('updateStatus', () => {
    it('calls repository.updateStatus for valid statusId', async () => {
      mockUpdateStatus.mockResolvedValueOnce(undefined);

      await emailService.updateStatus('id-1', NOTIFICATION_STATUSES.SENT);

      expect(mockUpdateStatus).toHaveBeenCalledWith('id-1', NOTIFICATION_STATUSES.SENT, null);
    });

    it('throws NotFoundError for invalid statusId', async () => {
      await expect(emailService.updateStatus('id-1', 999)).rejects.toThrow(NotFoundError);
      expect(mockUpdateStatus).not.toHaveBeenCalled();
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

      mockGetById.mockResolvedValueOnce(notification);

      const result = await emailService.getById('id-1');

      expect(mockGetById).toHaveBeenCalledWith('id-1');
      expect(result).toEqual(notification);
    });

    it('throws ValidationError when id is empty', async () => {
      await expect(emailService.getById('')).rejects.toThrow(ValidationError);
      expect(mockGetById).not.toHaveBeenCalled();
    });

    it('throws NotFoundError when notification not found', async () => {
      mockGetById.mockResolvedValueOnce(null);

      await expect(emailService.getById('missing-id')).rejects.toThrow(NotFoundError);
    });

    it('throws ForbiddenError when userId does not match notification userId', async () => {
      mockGetById.mockResolvedValueOnce({
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

      await expect(emailService.getById('id-1', 'user-B')).rejects.toThrow(ForbiddenError);
    });
  });

  describe('getStatsByUserId', () => {
    it('returns stats from repository', async () => {
      const stats = [{ type: 'email' as const, status: 'sent', count: 10 }];
      mockGetStatsByUserId.mockResolvedValueOnce(stats);

      const result = await emailService.getStatsByUserId('user-1');

      expect(mockGetStatsByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(stats);
    });

    it('throws ValidationError when id is empty', async () => {
      await expect(emailService.getStatsByUserId('')).rejects.toThrow(ValidationError);
      expect(mockGetStatsByUserId).not.toHaveBeenCalled();
    });
  });
});

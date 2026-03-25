import { describe, it, expect, vi, beforeEach } from 'vitest';
import db from '../config/database.js';
import notificationRepository from '../repositories/notificationRepository.js';
import { NOTIFICATION_STATUSES } from '../constants/index.js';

vi.stubGlobal('process', {
  ...process,
  exit: vi.fn(),
});

vi.mock('../config/database.js', () => ({
  default: {
    query: vi.fn(),
  },
}));

vi.mock('../config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockQuery = vi.mocked(db.query);

describe('notificationRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('inserts notification and returns created row', async () => {
      const created = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-1',
        type: 'email',
        channel: 'a@b.com',
        subject: 'Test',
        content: 'Body',
        statusId: 1,
        errorMessage: null,
        retryCount: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: null,
      };

      mockQuery.mockResolvedValueOnce({ rows: [created], rowCount: 1 } as any);

      const result = await notificationRepository.create({
        userId: 'user-1',
        channel: 'a@b.com',
        subject: 'Test',
        content: 'Body',
        metadata: {},
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO notifications'),
        ['user-1', 'a@b.com', 'Test', 'Body', {}],
      );
      expect(result).toEqual(created);
    });
  });

  describe('updateStatus (SENDING - claim)', () => {
    it('returns true when row is updated (claimed)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ id: 'id-1' }], rowCount: 1 } as any);

      const result = await notificationRepository.updateStatus('id-1', NOTIFICATION_STATUSES.SENDING);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        expect.arrayContaining(['id-1', NOTIFICATION_STATUSES.SENDING, NOTIFICATION_STATUSES.QUEUED, NOTIFICATION_STATUSES.RETRYING]),
      );
      expect(result).toBe(true);
    });

    it('returns false when no row updated (already claimed/sent)', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await notificationRepository.updateStatus('id-1', NOTIFICATION_STATUSES.SENDING);

      expect(result).toBe(false);
    });
  });

  describe('updateStatus (other statuses)', () => {
    it('updates status to SENT without error message', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await notificationRepository.updateStatus('id-1', NOTIFICATION_STATUSES.SENT);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        expect.any(Array),
      );
      expect(mockQuery.mock.calls[0][0]).toContain('errorMessage');
    });

    it('updates status to FAILED with error message', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      await notificationRepository.updateStatus('id-1', NOTIFICATION_STATUSES.FAILED, 'SMTP error');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE notifications'),
        ['id-1', NOTIFICATION_STATUSES.FAILED, 'SMTP error'],
      );
    });
  });

  describe('getById', () => {
    it('returns notification when found', async () => {
      const row = {
        id: 'id-1',
        userId: 'user-1',
        type: 'email',
        channel: 'a@b.com',
        subject: 'Subj',
        content: 'Content',
        statusId: 3,
        status: 'sent',
        errorMessage: null,
        retryCount: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: new Date(),
      };

      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 } as any);

      const result = await notificationRepository.getById('id-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN notification_statuses'),
        ['id-1'],
      );
      expect(result).toEqual(row);
    });

    it('returns null when not found', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 } as any);

      const result = await notificationRepository.getById('id-missing');

      expect(result).toBeNull();
    });
  });

  describe('getByUserId', () => {
    it('returns array of notifications', async () => {
      const rows = [
        {
          id: 'id-1',
          userId: 'user-1',
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
          sentAt: new Date(),
        },
      ];

      mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 } as any);

      const result = await notificationRepository.getByUserId('user-1', 50, 0);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE "userId"'),
        ['user-1', 50, 0],
      );
      expect(result).toEqual(rows);
    });
  });

  describe('getStatsByUserId', () => {
    it('returns stats array', async () => {
      const rows = [{ type: 'email', status: 'sent', count: 5 }];

      mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 } as any);

      const result = await notificationRepository.getStatsByUserId('user-1');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('GROUP BY'),
        ['user-1'],
      );
      expect(result).toEqual(rows);
    });
  });
});

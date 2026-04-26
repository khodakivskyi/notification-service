import { describe, it, expect, vi, beforeEach } from 'vitest';
import rabbitMQConnection from '../config/rabbitmq.js';
import emailQueue from '../queues/emailQueue.js';
import config from '../config/env.js';

vi.mock('../config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('../config/rabbitmq.js', () => ({
  default: {
    getConsumeChannel: vi.fn(),
    getPublishChannel: vi.fn(),
  },
}));

const mockGetConsumeChannel = vi.mocked(rabbitMQConnection.getConsumeChannel);
const mockGetPublishChannel = vi.mocked(rabbitMQConnection.getPublishChannel);

function createConsumeChannelMock(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    assertExchange: vi.fn().mockResolvedValue(undefined),
    assertQueue: vi.fn().mockResolvedValue(undefined),
    bindQueue: vi.fn().mockResolvedValue(undefined),
    checkQueue: vi.fn().mockResolvedValue({ messageCount: 2, consumerCount: 1 }),
    ...overrides,
  };
}

function createPublishChannelMock() {
  return {
    sendToQueue: vi.fn(),
    waitForConfirms: vi.fn().mockResolvedValue(undefined),
  };
}

describe('emailQueue', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('init', () => {
    it('asserts DLX, DLQ, main queue, and retry queue', async () => {
      const ch = createConsumeChannelMock();
      mockGetConsumeChannel.mockResolvedValueOnce(ch as never);

      await emailQueue.init();

      expect(ch.assertExchange).toHaveBeenCalledWith(config.rabbitmq.exchanges.dlx, 'direct', {
        durable: true,
      });
      expect(ch.assertQueue).toHaveBeenCalledWith(config.rabbitmq.queues.emailDlq, { durable: true });
      expect(ch.assertQueue).toHaveBeenCalledWith(config.rabbitmq.queues.email, {
        durable: true,
        arguments: {
          'x-max-length': config.rabbitmq.settings.maxLength,
          'x-dead-letter-exchange': config.rabbitmq.exchanges.dlx,
          'x-dead-letter-routing-key': config.rabbitmq.routingKeys.emailDlq,
        },
      });
      expect(ch.assertQueue).toHaveBeenCalledWith(config.rabbitmq.queues.emailRetry, {
        durable: true,
        arguments: {
          'x-dead-letter-exchange': '',
          'x-dead-letter-routing-key': config.rabbitmq.queues.email,
        },
      });
    });
  });

  describe('addJob', () => {
    it('publishes JSON job and waits for confirms', async () => {
      const publishCh = createPublishChannelMock();
      mockGetPublishChannel.mockResolvedValueOnce(publishCh as never);

      const ok = await emailQueue.addJob({
        to: 'user@example.com',
        subject: 'Hi',
        htmlContent: '<p>x</p>',
        notificationId: 'nid-1',
      });

      expect(ok).toBe(true);
      expect(publishCh.sendToQueue).toHaveBeenCalledWith(
        config.rabbitmq.queues.email,
        expect.any(Buffer),
        {
          persistent: true,
          contentType: 'application/json',
        },
      );
      const payload = JSON.parse((publishCh.sendToQueue.mock.calls[0][1] as Buffer).toString());
      expect(payload.data.to).toBe('user@example.com');
      expect(payload.data.notificationId).toBe('nid-1');
      expect(payload.retries).toBe(0);
      expect(typeof payload.timestamp).toBe('number');
      expect(publishCh.waitForConfirms).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('returns queue name and counts from checkQueue', async () => {
      const ch = createConsumeChannelMock({
        checkQueue: vi.fn().mockResolvedValue({ messageCount: 5, consumerCount: 2 }),
      });
      mockGetConsumeChannel.mockResolvedValueOnce(ch as never);

      const stats = await emailQueue.getStats();

      expect(stats).toEqual({
        queue: config.rabbitmq.queues.email,
        messageCount: 5,
        consumerCount: 2,
      });
      expect(ch.checkQueue).toHaveBeenCalledWith(config.rabbitmq.queues.email);
    });

    it('returns null when checkQueue fails', async () => {
      const ch = createConsumeChannelMock({
        checkQueue: vi.fn().mockRejectedValue(new Error('down')),
      });
      mockGetConsumeChannel.mockResolvedValueOnce(ch as never);

      await expect(emailQueue.getStats()).resolves.toBeNull();
    });
  });
});

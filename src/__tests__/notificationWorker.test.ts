import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as amqp from 'amqplib';
import { ValidationError } from '../exceptions/index.js';
import { NOTIFICATION_STATUSES } from '../constants/index.js';
import { callCallback } from '../utils/callback.js';
import config from '../config/env.js';
import { NotificationWorker } from '../queues/notificationWorker.js';
import type { NotificationJob, NotificationJobPayload } from '../queues/notificationQueue.js';
import type { INotificationService } from '../interfaces/INotificationService.js';
import type { INotificationChannel } from '../interfaces/INotificationChannel.js';

vi.mock('../config/logger.js', () => ({
  default: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock('../utils/callback.js', () => ({
  callCallback: vi.fn().mockResolvedValue(undefined),
}));

const mockCallCallback = vi.mocked(callCallback);

function createMockNotificationService(): INotificationService {
  return {
    createNotification: vi.fn(),
    updateStatus: vi.fn(),
    getById: vi.fn(),
    getStatsByUserId: vi.fn(),
  };
}

function createMockChannel(): INotificationChannel {
  return {
    send: vi.fn(),
  };
}

function sampleJob(
  overrides: Partial<Omit<NotificationJob, 'data'>> & { data?: Partial<NotificationJobPayload> } = {},
): NotificationJob {
  const { data: dataOverrides, ...rest } = overrides;
  return {
    data: {
      to: 'a@b.com',
      subject: 'S',
      htmlContent: '<p>h</p>',
      notificationId: 'n-1',
      callbackUrl: null,
      ...dataOverrides,
    },
    timestamp: Date.now(),
    retries: 0,
    ...rest,
  };
}

describe('notificationWorker', () => {
  let notifications: INotificationService;
  let channel: INotificationChannel;
  let worker: NotificationWorker;

  beforeEach(() => {
    vi.clearAllMocks();
    notifications = createMockNotificationService();
    channel = createMockChannel();
    worker = new NotificationWorker(notifications, channel);
  });

  describe('parseAndValidateMessage', () => {
    it('acks and returns null for invalid JSON', () => {
      const ack = vi.fn();
      const ch = { ack } as unknown as amqp.Channel;
      const msg = { content: Buffer.from('not-json') } as amqp.ConsumeMessage;

      const result = worker.parseAndValidateMessage(msg, ch);

      expect(result).toBeNull();
      expect(ack).toHaveBeenCalledWith(msg);
    });

    it('acks and returns null when notificationId is missing', () => {
      const ack = vi.fn();
      const ch = { ack } as unknown as amqp.Channel;
      const msg = {
        content: Buffer.from(JSON.stringify({ data: { to: 'a@b.com' } })),
      } as amqp.ConsumeMessage;

      const result = worker.parseAndValidateMessage(msg, ch);

      expect(result).toBeNull();
      expect(ack).toHaveBeenCalledWith(msg);
    });

    it('returns parsed job when valid', () => {
      const ack = vi.fn();
      const ch = { ack } as unknown as amqp.Channel;
      const job = sampleJob();
      const msg = { content: Buffer.from(JSON.stringify(job)) } as amqp.ConsumeMessage;

      const result = worker.parseAndValidateMessage(msg, ch);

      expect(result).toEqual(job);
      expect(ack).not.toHaveBeenCalled();
    });
  });

  describe('executeJob', () => {
    it('returns true and skips send when claim fails', async () => {
      vi.mocked(notifications.updateStatus).mockResolvedValueOnce(false);

      const job = sampleJob();
      const skipped = await worker.executeJob(job);

      expect(skipped).toBe(true);
      expect(notifications.updateStatus).toHaveBeenCalledWith(job.data.notificationId, NOTIFICATION_STATUSES.SENDING);
      expect(channel.send).not.toHaveBeenCalled();
    });

    it('delivers via channel and marks SENT when claim succeeds', async () => {
      vi.mocked(notifications.updateStatus).mockResolvedValueOnce(true);
      vi.mocked(channel.send).mockResolvedValueOnce(undefined);
      vi.mocked(notifications.updateStatus).mockResolvedValueOnce(undefined);

      const job = sampleJob();
      const skipped = await worker.executeJob(job);

      expect(skipped).toBe(false);
      expect(channel.send).toHaveBeenCalledWith(job.data.to, job.data.subject, job.data.htmlContent);
      expect(notifications.updateStatus).toHaveBeenLastCalledWith(job.data.notificationId, NOTIFICATION_STATUSES.SENT);
    });
  });

  describe('shouldRetry', () => {
    it('does not retry ValidationError', () => {
      const r = worker.shouldRetry(new ValidationError('x'), 0, 3);
      expect(r.isNonRetriable).toBe(true);
      expect(r.willRetry).toBe(false);
    });

    it('does not retry operational 4xx errors', () => {
      const err = Object.assign(new Error('bad req'), { isOperational: true, statusCode: 422 });
      const r = worker.shouldRetry(err, 0, 3);
      expect(r.isNonRetriable).toBe(true);
      expect(r.willRetry).toBe(false);
    });

    it('retries generic errors while under maxRetries', () => {
      const r = worker.shouldRetry(new Error('timeout'), 0, 3);
      expect(r.isNonRetriable).toBe(false);
      expect(r.willRetry).toBe(true);
    });

    it('stops retrying when currentRetries reaches maxRetries', () => {
      const r = worker.shouldRetry(new Error('timeout'), 3, 3);
      expect(r.willRetry).toBe(false);
    });
  });

  describe('getRetryDelay', () => {
    it('exponential backoff with cap', () => {
      expect(worker.getRetryDelay(1)).toBe(1000);
      expect(worker.getRetryDelay(2)).toBe(2000);
      expect(worker.getRetryDelay(10)).toBe(60_000);
    });
  });

  describe('handleSuccess', () => {
    it('acks without callback when skipped', async () => {
      const ack = vi.fn();
      const ch = { ack } as unknown as amqp.Channel;
      const job = sampleJob({ data: { callbackUrl: 'https://cb.example/hook' } });
      const msg = {} as amqp.ConsumeMessage;

      await worker.handleSuccess(job, msg, ch, Date.now(), { skipped: true });

      expect(ack).toHaveBeenCalledWith(msg);
      expect(mockCallCallback).not.toHaveBeenCalled();
    });

    it('invokes callback then acks when URL present', async () => {
      const ack = vi.fn();
      const ch = { ack } as unknown as amqp.Channel;
      const job = sampleJob({ data: { callbackUrl: 'https://cb.example/hook' } });
      const msg = {} as amqp.ConsumeMessage;
      vi.mocked(notifications.getById).mockResolvedValueOnce({
        id: job.data.notificationId,
        userId: 'u1',
        channel: job.data.to,
        subject: job.data.subject!,
        content: job.data.htmlContent!,
        statusId: NOTIFICATION_STATUSES.SENT,
        status: 'sent',
        errorMessage: null,
        retryCount: 0,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
        sentAt: new Date(),
      } as never);

      await worker.handleSuccess(job, msg, ch, Date.now(), { skipped: false });

      expect(mockCallCallback).toHaveBeenCalledWith(
        'https://cb.example/hook',
        expect.objectContaining({ notificationId: job.data.notificationId }),
      );
      expect(ack).toHaveBeenCalledWith(msg);
    });
  });

  describe('handleError', () => {
    it('schedules retry, acks message, and updates RETRYING', async () => {
      const ack = vi.fn();
      const nack = vi.fn();
      const consumeChannel = { ack, nack } as unknown as amqp.Channel;
      const sendToQueue = vi.fn();
      const waitForConfirms = vi.fn().mockResolvedValue(undefined);
      const publishChannel = { sendToQueue, waitForConfirms } as unknown as amqp.ConfirmChannel;

      const job = sampleJob();
      const msg = {} as amqp.ConsumeMessage;
      vi.mocked(notifications.updateStatus).mockResolvedValue(undefined);

      await worker.handleError(job, new Error('smtp down'), msg, consumeChannel, publishChannel);

      expect(notifications.updateStatus).toHaveBeenCalledWith(job.data.notificationId, NOTIFICATION_STATUSES.RETRYING);
      expect(sendToQueue).toHaveBeenCalledWith(
        config.rabbitmq.queues.outboundRetry,
        expect.any(Buffer),
        expect.objectContaining({ persistent: true }),
      );
      expect(ack).toHaveBeenCalledWith(msg);
      expect(nack).not.toHaveBeenCalled();
    });

    it('marks FAILED and nacks when non-retriable', async () => {
      const ack = vi.fn();
      const nack = vi.fn();
      const consumeChannel = { ack, nack } as unknown as amqp.Channel;
      const publishChannel = {
        sendToQueue: vi.fn(),
        waitForConfirms: vi.fn(),
      } as unknown as amqp.ConfirmChannel;

      const job = sampleJob();
      const msg = {} as amqp.ConsumeMessage;
      vi.mocked(notifications.updateStatus).mockResolvedValue(undefined);

      await worker.handleError(job, new ValidationError('bad'), msg, consumeChannel, publishChannel);

      expect(notifications.updateStatus).toHaveBeenCalledWith(
        job.data.notificationId,
        NOTIFICATION_STATUSES.FAILED,
        'bad',
      );
      expect(nack).toHaveBeenCalledWith(msg, false, false);
      expect(ack).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const pgClientCtorMock = vi.fn();
const amqpConnectMock = vi.fn();

const spinnerFactory = vi.fn();
const spinnerStart = vi.fn();
const spinnerSucceed = vi.fn();
const spinnerFail = vi.fn();

vi.mock('pg', () => ({
  default: {
    Client: pgClientCtorMock,
  },
}));

vi.mock('amqplib', () => ({
  default: {
    connect: amqpConnectMock,
  },
}));

vi.mock('ora', () => ({
  default: (...args: unknown[]) => spinnerFactory(...args),
}));

describe('testConnections', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    spinnerStart.mockReturnValue({
      succeed: spinnerSucceed,
      fail: spinnerFail,
    });

    spinnerFactory.mockReturnValue({
      start: spinnerStart,
    });
  });

  it('handles db and rabbit failures, smtp invalid', async () => {
    const client = {
      connect: vi.fn().mockRejectedValue(new Error('db down')),
      query: vi.fn(),
      end: vi.fn(),
    };
    pgClientCtorMock.mockReturnValue(client);

    amqpConnectMock.mockRejectedValue(new Error('mq down'));

    const { testConnections } = await import('../cli/commands/test-connection.js');

    const result = await testConnections({
      database: { url: 'postgres://x' },
      rabbitmq: { url: 'amqp://x' },
      smtp: { host: '', port: 0, user: '', pass: 'p' },
    });

    expect(result).toEqual({ database: false, rabbitmq: false, smtp: false });
    expect(spinnerFail).toHaveBeenCalled();
  });
});

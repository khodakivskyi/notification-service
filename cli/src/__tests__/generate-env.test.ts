import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
// @ts-ignore
import { EnvAnswers, generateEnvFile, writeEnvFile } from '../commands/generate-env.js';

const baseAnswers: EnvAnswers = {
  projectName: 'My Notification Service',
  environment: 'development',
  port: '3001',
  useDocker: true,
  dbName: 'notifications',
  smtpProvider: 'mailtrap',
  smtpUser: 'smtp-user',
  smtpPassword: 'smtp-pass',
  senderEmail: 'noreply@example.com',
  enableRateLimit: false,
  enableApiKey: true,
};

describe('generateEnvFile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should generate env with docker defaults', () => {
    const env = generateEnvFile(baseAnswers);

    expect(env).toContain('NODE_ENV=development');
    expect(env).toContain('LOG_LEVEL=debug');

    expect(env).toContain('DATABASE_URL=postgresql://postgres:postgres@db:5432/notifications');
    expect(env).toContain('RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672');
    expect(env).toContain('OUTBOUND_QUEUE_NAME=email_notifications');
    expect(env).toContain('OUTBOUND_DLQ_NAME=email.dlq');
    expect(env).toContain('RABBITMQ_OUTBOUND_TTL=300000');

    expect(env).toContain('SMTP_HOST=smtp.mailtrap.io');
    expect(env).toContain('SMTP_PORT=2525');
    expect(env).toContain('SMTP_USER=smtp-user');
    expect(env).toContain('SMTP_PASS=smtp-pass');
  });

  it('should generate env with non-docker custom db/rabbit values', () => {
    const env = generateEnvFile({
      ...baseAnswers,
      useDocker: false,
      dbHost: '127.0.0.1',
      dbPort: '5544',
      dbUser: 'myuser',
      dbPassword: 'mypass',
      rabbitHost: 'mq.local',
      rabbitPort: '5673',
      rabbitUser: 'rabbit-user',
      rabbitPassword: 'rabbit-pass',
    });

    expect(env).toContain('DATABASE_URL=postgresql://myuser:mypass@127.0.0.1:5544/notifications');
    expect(env).toContain('RABBITMQ_URL=amqp://rabbit-user:rabbit-pass@mq.local:5673');
  });

  it('should use gmail smtp preset when smtpProvider=gmail', () => {
    const env = generateEnvFile({
      ...baseAnswers,
      smtpProvider: 'gmail',
      smtpHost: 'ignored-host',
      smtpPort: '9999',
    });

    expect(env).toContain('SMTP_HOST=smtp.gmail.com');
    expect(env).toContain('SMTP_PORT=587');
  });

  it('should use custom smtp host/port when smtpProvider=custom', () => {
    const env = generateEnvFile({
      ...baseAnswers,
      smtpProvider: 'custom',
      smtpHost: 'smtp.custom.local',
      smtpPort: '2526',
    });

    expect(env).toContain('SMTP_HOST=smtp.custom.local');
    expect(env).toContain('SMTP_PORT=2526');
  });

  it('should include rate limit block only when enableRateLimit=true', () => {
    const withRateLimit = generateEnvFile({
      ...baseAnswers,
      enableRateLimit: true,
      redisUrl: 'redis://localhost:6380',
    });

    expect(withRateLimit).toContain('RATE_LIMIT_ENABLED=true');
    expect(withRateLimit).toContain('REDIS_URL=redis://localhost:6380');

    const withoutRateLimit = generateEnvFile({
      ...baseAnswers,
      enableRateLimit: false,
    });

    expect(withoutRateLimit).not.toContain('RATE_LIMIT_ENABLED=true');
    expect(withoutRateLimit).not.toContain('REDIS_URL=');
  });

  it('should keep provided apiKey when enableApiKey=true and apiKey is set', () => {
    const env = generateEnvFile({
      ...baseAnswers,
      enableApiKey: true,
      apiKey: 'my-static-key',
    });

    expect(env).toContain('API_KEY=my-static-key');
  });

  it('should auto-generate apiKey when enableApiKey=true and apiKey is empty', () => {
    const env = generateEnvFile({
      ...baseAnswers,
      enableApiKey: true,
      apiKey: '',
    });

    expect(env).toContain('API_KEY=');
  });

  it('should set empty API_KEY when enableApiKey=false', () => {
    const env = generateEnvFile({
      ...baseAnswers,
      enableApiKey: false,
      apiKey: 'must-not-be-used',
    });

    expect(env).not.toContain('API_KEY=');
  });
});

describe('writeEnvFile', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true when fs.writeFileSync succeeds', () => {
    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => undefined);

    const ok = writeEnvFile('A=B', '.env.test');

    expect(ok).toBe(true);
    expect(writeSpy).toHaveBeenCalledWith('.env.test', 'A=B', 'utf-8');
  });

  it('should return false when fs.writeFileSync throws', () => {
    vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
      throw new Error('disk full');
    });

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const ok = writeEnvFile('A=B', '.env.test');

    expect(ok).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });
});

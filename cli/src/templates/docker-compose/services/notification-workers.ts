import type { DockerComposeAnswers } from '../types.js';
import { resolveDb, resolveRabbit, resolveSmtp } from '../helpers.js';

export function notificationWorkers(answers: DockerComposeAnswers) {
  const db = resolveDb(answers);
  const rabbit = resolveRabbit(answers);
  const smtp = resolveSmtp(answers);

  const environment: Record<string, string> = {
    NODE_ENV: answers.environment,
    DATABASE_URL: `postgresql://${db.user}:${db.password}@${db.host}:${db.port}/${db.name}`,
    RABBITMQ_URL: `amqp://${rabbit.user}:${rabbit.password}@${rabbit.host}:${rabbit.port}`,
    RABBITMQ_DLX_EXCHANGE: 'notification.dlx',
    OUTBOUND_QUEUE_NAME: 'email_notifications',
    OUTBOUND_DLQ_NAME: 'email.dlq',
    OUTBOUND_DLQ_ROUTING_KEY: 'email.dlq',
    OUTBOUND_RETRY_QUEUE_NAME: 'email.retry',
    RABBITMQ_OUTBOUND_TTL: '300000',
    RABBITMQ_OUTBOUND_MAX_LENGTH: '10000',
    SMTP_HOST: smtp.host,
    SMTP_PORT: smtp.port,
    SMTP_USER: smtp.user,
    SMTP_PASS: smtp.pass,
    RATE_LIMIT_ENABLED: answers.enableRateLimit ? 'true' : 'false',
  };

  if (answers.enableRateLimit) {
    environment.REDIS_URL = 'redis://redis:6379';
  }

  return {
    image: 'ghcr.io/khodakivskyi/notification-service:latest',
    container_name: 'notification-workers',
    command: ['node', 'dist/workers.js'],
    environment,
    depends_on: ['notification-service'],
    restart: 'unless-stopped',
  };
}

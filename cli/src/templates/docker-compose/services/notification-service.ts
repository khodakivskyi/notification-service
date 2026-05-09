import type { DockerComposeAnswers } from '../types.js';
import { resolveDb, resolveRabbit, resolveSmtp } from '../helpers.js';

export function notificationService(answers: DockerComposeAnswers) {
  const db = resolveDb(answers);
  const rabbit = resolveRabbit(answers);
  const smtp = resolveSmtp(answers);

  const environment: Record<string, string> = {
    NODE_ENV: answers.environment,
    PORT: answers.port,
    LOG_LEVEL: answers.environment === 'production' ? 'info' : 'debug',
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
    API_KEY_ENABLED: answers.enableApiKey ? 'true' : 'false',
    API_KEY: answers.apiKey || '',
    WEBHOOKS_ENABLED: answers.enableWebhooks ? 'true' : 'false',
    RATE_LIMIT_ENABLED: answers.enableRateLimit ? 'true' : 'false',
  };

  if (answers.enableRateLimit) {
    environment.REDIS_URL = 'redis://redis:6379';
  }

  const service: Record<string, any> = {
    image: 'ghcr.io/khodakivskyi/notification-service:latest',
    container_name: 'notification-service',
    ports: [`${answers.port}:${answers.port}`],
    environment,
    restart: 'unless-stopped',
  };

  if (answers.useDocker) {
    const dependsOn = ['db', 'rabbitmq'];
    if (answers.enableRateLimit) dependsOn.push('redis');
    service.depends_on = dependsOn;
  }

  return service;
}

import type { DockerComposeAnswers, DockerComposeDoc } from './types.js';
import { notificationService } from './services/notification-service.js';
import { notificationWorkers } from './services/notification-workers.js';
import { postgresService } from './services/postgres.js';
import { rabbitmqService } from './services/rabbitmq.js';
import { redisService } from './services/redis.js';

export function buildCompose(answers: DockerComposeAnswers): DockerComposeDoc {
  const services: Record<string, any> = {
    'notification-service': notificationService(answers),
    'notification-workers': notificationWorkers(answers),
  };

  if (answers.useDocker) {
    services.db = postgresService(answers);
    services.rabbitmq = rabbitmqService(answers);
    if (answers.enableRateLimit) {
      services.redis = redisService();
    }
  }

  const doc: DockerComposeDoc = {
    version: '3.8',
    services,
  };

  if (answers.useDocker) {
    doc.volumes = {
      postgres_data: {},
      rabbitmq_data: {},
      redis_data: {},
    };
    doc.networks = {
      default: { driver: 'bridge' },
    };
  }

  return doc;
}

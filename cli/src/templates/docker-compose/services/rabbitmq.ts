import type { DockerComposeAnswers } from '../types.js';

export function rabbitmqService(answers: DockerComposeAnswers) {
  return {
    image: 'rabbitmq:3-management-alpine',
    container_name: 'notification-rabbitmq',
    environment: {
      RABBITMQ_DEFAULT_USER: answers.rabbitUser || 'guest',
      RABBITMQ_DEFAULT_PASS: answers.rabbitPassword || 'guest',
    },
    ports: [`${answers.rabbitPort || '5672'}:5672`, '15672:15672'],
    volumes: ['rabbitmq_data:/var/lib/rabbitmq'],
    healthcheck: {
      test: 'rabbitmq-diagnostics -q ping',
      interval: '10s',
      timeout: '5s',
      retries: 5,
    },
    restart: 'unless-stopped',
  };
}

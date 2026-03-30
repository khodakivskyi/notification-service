import fs from 'fs';
import chalk from 'chalk';
import {
  analyzeDockerCompose,
  mergeDockerComposeFiles,
} from '../utils/docker-compose-analyzer.js';
import yaml from 'js-yaml';

interface DockerComposeAnswers {
  useDocker: boolean;
  hasExistingDockerCompose?: boolean;
  dockerComposePath?: string;
  port: string;
  dbHost?: string;
  dbPort?: string;
  dbUser?: string;
  dbPassword?: string;
  dbName: string;
  rabbitHost?: string;
  rabbitPort?: string;
  rabbitUser?: string;
  rabbitPassword?: string;
  enableRateLimit: boolean;
  environment: 'development' | 'production';
  [key: string]: any;
}

export function generateDockerCompose(answers: DockerComposeAnswers): string {
  const dbHost = answers.useDocker ? 'db' : answers.dbHost || 'localhost';
  const dbPort = answers.useDocker ? '5432' : answers.dbPort || '5432';
  const dbUser = answers.dbUser || 'postgres';
  const dbPassword = answers.dbPassword || 'postgres';

  const rabbitHost = answers.useDocker ? 'rabbitmq' : answers.rabbitHost || 'localhost';
  const rabbitPort = answers.useDocker ? '5672' : answers.rabbitPort || '5672';
  const rabbitUser = answers.rabbitUser || 'guest';
  const rabbitPassword = answers.rabbitPassword || 'guest';

  const baseServices = `version: '3.8'

${answers.useDocker ? getPostgresService(answers) : ''}
${answers.useDocker ? getRabbitMQService(answers) : ''}
${answers.useDocker && answers.enableRateLimit ? getRedisService() : ''}

services:
  notification-service:
    image: ghcr.io/khodakivskyi/notification-service:latest
    container_name: notification-service
    ports:
      - "${answers.port}:${answers.port}"
    environment:
      NODE_ENV: ${answers.environment}
      PORT: ${answers.port}
      LOG_LEVEL: ${answers.environment === 'production' ? 'info' : 'debug'}
      DATABASE_URL: postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${answers.dbName}
      RABBITMQ_URL: amqp://${rabbitUser}:${rabbitPassword}@${rabbitHost}:${rabbitPort}
      SMTP_HOST: ${answers.smtpHost || 'smtp.mailtrap.io'}
      SMTP_PORT: ${answers.smtpPort || '2525'}
      SMTP_USER: ${answers.smtpUser}
      SMTP_PASS: ${answers.smtpPassword}
      SENDER_EMAIL: ${answers.senderEmail}
      API_KEY_ENABLED: ${answers.enableApiKey ? 'true' : 'false'}
      API_KEY: ${answers.apiKey || ''}
      WEBHOOKS_ENABLED: ${answers.enableWebhooks ? 'true' : 'false'}
      ${answers.enableRateLimit ? 'RATE_LIMIT_ENABLED: true\n      REDIS_URL: redis://redis:6379' : 'RATE_LIMIT_ENABLED: false'}
    ${
      answers.useDocker
        ? `depends_on:
      - db
      - rabbitmq
      ${answers.enableRateLimit ? '- redis' : ''}`
        : ''
    }
    restart: unless-stopped

  notification-workers:
    image: ghcr.io/khodakivskyi/notification-service:latest
    container_name: notification-workers
    command: ["node", "dist/workers.js"]
    environment:
      NODE_ENV: ${answers.environment}
      DATABASE_URL: postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${answers.dbName}
      RABBITMQ_URL: amqp://${rabbitUser}:${rabbitPassword}@${rabbitHost}:${rabbitPort}
      SMTP_HOST: ${answers.smtpHost || 'smtp.mailtrap.io'}
      SMTP_PORT: ${answers.smtpPort || '2525'}
      SMTP_USER: ${answers.smtpUser}
      SMTP_PASS: ${answers.smtpPassword}
      SENDER_EMAIL: ${answers.senderEmail}
      ${answers.enableRateLimit ? 'RATE_LIMIT_ENABLED: true\n      REDIS_URL: redis://redis:6379' : 'RATE_LIMIT_ENABLED: false'}
    depends_on:
      - notification-service
    restart: unless-stopped

${answers.useDocker ? getVolumesAndNetworks() : ''}
`;

  return baseServices;
}

function getPostgresService(answers: DockerComposeAnswers): string {
  return `
  db:
    image: postgres:15-alpine
    container_name: notification-db
    environment:
      POSTGRES_USER: ${answers.dbUser || 'postgres'}
      POSTGRES_PASSWORD: ${answers.dbPassword || 'postgres'}
      POSTGRES_DB: ${answers.dbName}
    ports:
      - "${answers.dbPort || '5432'}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
`;
}

function getRabbitMQService(answers: DockerComposeAnswers): string {
  return `
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: notification-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: ${answers.rabbitUser || 'guest'}
      RABBITMQ_DEFAULT_PASS: ${answers.rabbitPassword || 'guest'}
    ports:
      - "${answers.rabbitPort || '5672'}:5672"
      - "15672:15672"
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "-q", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
`;
}

function getRedisService(): string {
  return `
  redis:
    image: redis:7-alpine
    container_name: notification-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
`;
}

function getVolumesAndNetworks(): string {
  return `
volumes:
  postgres_data:
  rabbitmq_data:
  redis_data:

networks:
  default:
    driver: bridge
`;
}

export function handleExistingDockerCompose(answers: DockerComposeAnswers): {
  dockerComposePath: string;
  mergedPath: string;
} {
  if (!answers.hasExistingDockerCompose || !answers.dockerComposePath) {
    throw new Error('No existing docker-compose file specified');
  }

  const analyzed = analyzeDockerCompose(answers.dockerComposePath);

  if (analyzed.hasPostgres && analyzed.postgresInfo) {
    answers.dbHost = analyzed.postgresInfo.host;
    answers.dbPort = analyzed.postgresInfo.port;
    answers.dbUser = analyzed.postgresInfo.user;
    answers.dbPassword = analyzed.postgresInfo.password;
    answers.dbName = analyzed.postgresInfo.database || 'notifications';
  }

  if (analyzed.hasRabbitMQ && analyzed.rabbitmqInfo) {
    answers.rabbitHost = analyzed.rabbitmqInfo.host;
    answers.rabbitPort = analyzed.rabbitmqInfo.port;
    answers.rabbitUser = analyzed.rabbitmqInfo.user;
    answers.rabbitPassword = analyzed.rabbitmqInfo.password;
  }

  if (analyzed.hasRedis && analyzed.redisInfo) {
    answers.enableRateLimit = true;
  }

  const notificationServiceConfig = yaml.load(generateDockerCompose(answers)) as Record<
    string,
    any
  >;

  // merge with existing docker-compose
  const merged = mergeDockerComposeFiles(answers.dockerComposePath, notificationServiceConfig);

  const mergedPath = answers.dockerComposePath.replace(/\.yml$/, '.with-notification-service.yml');

  fs.writeFileSync(mergedPath, merged, 'utf-8');

  console.log(chalk.green(`\n✓ Created ${mergedPath}`));
  console.log(chalk.gray(`  (Use this file: docker-compose -f ${mergedPath} up -d)`));

  return {
    dockerComposePath: answers.dockerComposePath,
    mergedPath,
  };
}

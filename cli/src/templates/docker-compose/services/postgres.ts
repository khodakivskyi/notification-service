import type { DockerComposeAnswers } from '../types.js';

export function postgresService(answers: DockerComposeAnswers) {
  return {
    image: 'postgres:15-alpine',
    container_name: 'notification-db',
    environment: {
      POSTGRES_USER: answers.dbUser || 'postgres',
      POSTGRES_PASSWORD: answers.dbPassword || 'postgres',
      POSTGRES_DB: answers.dbName,
    },
    ports: [`${answers.dbPort || '5432'}:5432`],
    volumes: ['postgres_data:/var/lib/postgresql/data'],
    healthcheck: {
      test: 'pg_isready -U postgres',
      interval: '10s',
      timeout: '5s',
      retries: 5,
    },
    restart: 'unless-stopped',
  };
}

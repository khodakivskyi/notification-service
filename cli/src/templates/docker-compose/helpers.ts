import type { DockerComposeAnswers } from './types.js';

export function resolveDb(answers: DockerComposeAnswers) {
  return {
    host: answers.useDocker ? 'db' : answers.dbHost || 'localhost',
    port: answers.useDocker ? '5432' : answers.dbPort || '5432',
    user: answers.dbUser || 'postgres',
    password: answers.dbPassword || 'postgres',
    name: answers.dbName,
  };
}

export function resolveRabbit(answers: DockerComposeAnswers) {
  return {
    host: answers.useDocker ? 'rabbitmq' : answers.rabbitHost || 'localhost',
    port: answers.useDocker ? '5672' : answers.rabbitPort || '5672',
    user: answers.rabbitUser || 'guest',
    password: answers.rabbitPassword || 'guest',
  };
}

export function resolveSmtp(answers: DockerComposeAnswers) {
  const host =
    answers.smtpProvider === 'gmail'
      ? 'smtp.gmail.com'
      : answers.smtpProvider === 'custom'
        ? answers.smtpHost || 'localhost'
        : answers.smtpHost || 'smtp.mailtrap.io';

  const port =
    answers.smtpProvider === 'gmail'
      ? '587'
      : answers.smtpProvider === 'custom'
        ? answers.smtpPort || '587'
        : answers.smtpPort || '2525';

  return {
    host,
    port,
    user: answers.smtpUser,
    pass: answers.smtpPassword,
  };
}

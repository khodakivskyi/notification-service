import type { DistinctQuestion } from 'inquirer';
import fs from 'fs';

export interface SetupAnswers {
  projectName: string;
  environment: 'development' | 'production';
  port: string;

  useDocker: boolean;
  hasExistingDockerCompose?: boolean;
  dockerComposePath?: string;

  dbHost?: string;
  dbPort?: string;
  dbUser?: string;
  dbPassword?: string;
  dbName: string;

  rabbitHost?: string;
  rabbitPort?: string;
  rabbitUser?: string;
  rabbitPassword?: string;

  smtpProvider: 'mailtrap' | 'gmail' | 'custom';
  smtpHost?: string;
  smtpPort?: string;
  smtpUser: string;
  smtpPassword: string;
  senderEmail: string;

  enableRateLimit: boolean;
  redisUrl?: string;

  enableApiKey: boolean;
  apiKey?: string;

  startDocker?: boolean;
}

type PromptState = Partial<SetupAnswers>;

const isPort = (value: string): true | string => {
  const p = Number.parseInt(value, 10);
  return Number.isInteger(p) && p > 0 && p < 65536 ? true : 'Port must be between 1 and 65535';
};

const isEmail = (value: string): true | string =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? true : 'Invalid email';

const fileExists = (value: string): true | string => {
  if (!value?.trim()) return 'Path is required';
  return fs.existsSync(value) ? true : `File not found: ${value}`;
};

export const setupQuestions: DistinctQuestion<PromptState>[] = [
  {
    type: 'input',
    name: 'projectName',
    message: 'Project name:',
    default: 'My Notification Service',
    validate: (input: string) => (input.trim() ? true : 'Project name is required'),
  },
  {
    type: 'select',
    name: 'environment',
    message: 'Environment:',
    default: 'development',
    choices: [
      { name: 'Development', value: 'development' },
      { name: 'Production', value: 'production' },
    ],
  },
  { type: 'input', name: 'port', message: 'Service port:', default: '3001', validate: isPort },

  {
    type: 'confirm',
    name: 'useDocker',
    message: 'Use Docker for PostgreSQL + RabbitMQ?',
    default: true,
  },

  {
    type: 'confirm',
    name: 'hasExistingDockerCompose',
    message: 'Do you already have a docker-compose file?',
    default: false,
    when: (a: PromptState) => !!a.useDocker,
  },
  {
    type: 'input',
    name: 'dockerComposePath',
    message: 'Path to docker-compose file:',
    default: 'docker-compose.yml',
    when: (a: PromptState) => !!a.useDocker && !!a.hasExistingDockerCompose,
    validate: fileExists,
  },

  {
    type: 'input',
    name: 'dbHost',
    message: 'PostgreSQL host:',
    default: 'localhost',
    when: (a: PromptState) => !a.useDocker,
  },
  {
    type: 'input',
    name: 'dbPort',
    message: 'PostgreSQL port:',
    default: '5432',
    when: (a: PromptState) => !a.useDocker,
    validate: isPort,
  },
  {
    type: 'input',
    name: 'dbUser',
    message: 'PostgreSQL user:',
    default: 'postgres',
    when: (a: PromptState) => !a.useDocker,
  },
  {
    type: 'password',
    name: 'dbPassword',
    message: 'PostgreSQL password:',
    when: (a: PromptState) => !a.useDocker,
  },

  { type: 'input', name: 'dbName', message: 'Database name:', default: 'notifications' },

  {
    type: 'input',
    name: 'rabbitHost',
    message: 'RabbitMQ host:',
    default: 'localhost',
    when: (a: PromptState) => !a.useDocker,
  },
  {
    type: 'input',
    name: 'rabbitPort',
    message: 'RabbitMQ port:',
    default: '5672',
    when: (a: PromptState) => !a.useDocker,
    validate: isPort,
  },

  {
    type: 'select',
    name: 'smtpProvider',
    message: 'SMTP provider:',
    default: 'mailtrap',
    choices: [
      { name: 'Mailtrap (dev)', value: 'mailtrap' },
      { name: 'Gmail', value: 'gmail' },
      { name: 'Custom SMTP', value: 'custom' },
    ],
  },
  {
    type: 'input',
    name: 'smtpHost',
    message: 'SMTP host:',
    default: 'smtp.mailtrap.io',
    when: (a: PromptState) => a.smtpProvider === 'custom',
  },
  {
    type: 'input',
    name: 'smtpPort',
    message: 'SMTP port:',
    default: '587',
    when: (a: PromptState) => a.smtpProvider === 'custom',
    validate: isPort,
  },
  { type: 'input', name: 'smtpUser', message: 'SMTP username/email:' },
  { type: 'password', name: 'smtpPassword', message: 'SMTP password:' },
  {
    type: 'input',
    name: 'senderEmail',
    message: 'Sender email:',
    default: 'noreply@example.com',
    validate: isEmail,
  },

  { type: 'confirm', name: 'enableRateLimit', message: 'Enable rate limiting?', default: false },
  {
    type: 'input',
    name: 'redisUrl',
    message: 'Redis URL:',
    default: 'redis://localhost:6379',
    when: (a: PromptState) => !!a.enableRateLimit,
  },

  { type: 'confirm', name: 'enableApiKey', message: 'Enable API key auth?', default: true },
  {
    type: 'input',
    name: 'apiKey',
    message: 'API key (empty = auto-generate):',
    when: (a: PromptState) => !!a.enableApiKey,
  },

  {
    type: 'confirm',
    name: 'startDocker',
    message: 'Start Docker containers now?',
    default: true,
    when: (a: PromptState) => !!a.useDocker,
  },
];

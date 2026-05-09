import fs from 'fs';
import { SetupAnswers } from '../prompts/questions.js';
import { buildEnvTemplate } from '../templates/env.template.js';

export interface EnvAnswers {
  projectName: string;
  environment: 'development' | 'production';
  port: string;
  useDocker: boolean;
  dbHost?: string;
  dbPort?: string;
  dbUser?: string;
  dbPassword?: string;
  dbName: string;
  rabbitHost?: string;
  rabbitPort?: string;
  rabbitUser?: string;
  rabbitPassword?: string;
  smtpProvider: string;
  smtpHost?: string;
  smtpPort?: string;
  smtpUser: string;
  smtpPassword: string;
  senderEmail: string;
  enableRateLimit: boolean;
  redisUrl?: string;
  enableApiKey: boolean;
  apiKey?: string;
}

export function generateEnvFile(answers: SetupAnswers): string {
  return buildEnvTemplate(answers);
}

export function writeEnvFile(content: string, filepath: string = '.env'): boolean {
  try {
    fs.writeFileSync(filepath, content, 'utf-8');
    return true;
  } catch (error) {
    console.error('Failed to write .env file:', error);
    return false;
  }
}

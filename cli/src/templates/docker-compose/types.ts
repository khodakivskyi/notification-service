export interface DockerComposeAnswers {
  useDocker: boolean;
  hasExistingDockerCompose?: boolean;
  dockerComposePath?: string;

  projectName?: string;
  environment: 'development' | 'production';
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

  smtpProvider?: 'gmail' | 'custom' | 'mailtrap';
  smtpHost?: string;
  smtpPort?: string;
  smtpUser: string;
  smtpPassword: string;

  enableRateLimit: boolean;
  enableApiKey?: boolean;
  apiKey?: string;
  enableWebhooks?: boolean;

  [key: string]: any;
}

export interface DockerComposeDoc {
  version?: string;
  services: Record<string, any>;
  volumes?: Record<string, any>;
  networks?: Record<string, any>;
}

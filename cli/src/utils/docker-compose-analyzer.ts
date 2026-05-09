import fs from 'fs';
import yaml from 'js-yaml';

interface DockerService {
  image?: string;
  environment?: Record<string, string>;
  ports?: string[];
  [key: string]: any;
}

interface DockerComposeFile {
  services?: Record<string, DockerService>;
  volumes?: Record<string, any>;
  networks?: Record<string, any>;
}

export interface AnalyzedServices {
  hasPostgres: boolean;
  postgresInfo?: {
    host?: string;
    port: string;
    user?: string;
    password?: string;
    database?: string;
  };
  hasRabbitMQ: boolean;
  rabbitmqInfo?: {
    host?: string;
    port: string;
    user?: string;
    password?: string;
  };
  hasRedis: boolean;
  redisInfo?: {
    host?: string;
    port: string;
  };
  rawContent?: string;
}

export function analyzeDockerCompose(filepath: string): AnalyzedServices {
  try {
    const content = fs.readFileSync(filepath, 'utf-8');
    const config = yaml.load(content) as DockerComposeFile;

    const result: AnalyzedServices = {
      hasPostgres: false,
      hasRabbitMQ: false,
      hasRedis: false,
      rawContent: content,
    };

    if (!config.services) {
      return result;
    }

    // try to find PostgreSQL
    for (const [serviceName, service] of Object.entries(config.services)) {
      if (service.image?.includes('postgres')) {
        result.hasPostgres = true;
        result.postgresInfo = {
          host: serviceName,
          port: extractPort(service.ports, 5432),
          user: service.environment?.POSTGRES_USER || 'postgres',
          password: service.environment?.POSTGRES_PASSWORD || 'postgres',
          database: service.environment?.POSTGRES_DB || 'notifications',
        };
      }

      // try to find RabbitMQ
      if (service.image?.includes('rabbitmq')) {
        result.hasRabbitMQ = true;
        result.rabbitmqInfo = {
          host: serviceName,
          port: extractPort(service.ports, 5672),
          user: service.environment?.RABBITMQ_DEFAULT_USER || 'guest',
          password: service.environment?.RABBITMQ_DEFAULT_PASS || 'guest',
        };
      }

      // try to find Redis
      if (service.image?.includes('redis')) {
        result.hasRedis = true;
        result.redisInfo = {
          host: serviceName,
          port: extractPort(service.ports, 6379),
        };
      }
    }

    return result;
  } catch (error) {
    console.error('Failed to analyze docker-compose.yml:', error);
    return {
      hasPostgres: false,
      hasRabbitMQ: false,
      hasRedis: false,
    };
  }
}

function extractPort(ports: string[] | undefined, defaultPort: number): string {
  if (!ports || ports.length === 0) return defaultPort.toString();

  const firstPort = ports[0];
  const parts = firstPort.split(':');
  return parts[parts.length - 1];
}

export function mergeDockerComposeFiles(
  existingPath: string,
  notificationServiceConfig: Record<string, any>,
): string {
  try {
    const content = fs.readFileSync(existingPath, 'utf-8');
    const config = yaml.load(content) as DockerComposeFile;

    if (!config.services) {
      config.services = {};
    }

    config.services['notification-service'] =
      notificationServiceConfig.services['notification-service'];
    config.services['notification-workers'] =
      notificationServiceConfig.services['notification-workers'];

    if (notificationServiceConfig.volumes) {
      if (!config.volumes) {
        config.volumes = {};
      }
      Object.assign(config.volumes, notificationServiceConfig.volumes);
    }

    if (notificationServiceConfig.networks) {
      if (!config.networks) {
        config.networks = {};
      }
      Object.assign(config.networks, notificationServiceConfig.networks);
    }

    return yaml.dump(config, { lineWidth: -1 });
  } catch (error) {
    console.error('Failed to merge docker-compose files:', error);
    return '';
  }
}

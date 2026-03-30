import fs from 'fs';
import chalk from 'chalk';
import yaml from 'js-yaml';
import type { DockerComposeAnswers } from '../templates/docker-compose/types.js';
import { buildCompose } from '../templates/docker-compose/base.js';
import { analyzeDockerCompose, mergeDockerComposeFiles } from '../utils/docker-compose-analyzer.js';

export function generateDockerCompose(answers: DockerComposeAnswers): string {
  const composeDoc = buildCompose(answers);
  return yaml.dump(composeDoc, {
    noRefs: true,
    lineWidth: -1,
    quotingType: '"',
    forceQuotes: false,
  });
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
  const merged = mergeDockerComposeFiles(answers.dockerComposePath, notificationServiceConfig);

  const mergedPath = answers.dockerComposePath.replace(
    /\.ya?ml$/i,
    '.with-notification-service.yml',
  );
  fs.writeFileSync(mergedPath, merged, 'utf-8');

  console.log(chalk.green(`\n✓ Created ${mergedPath}`));
  console.log(chalk.gray(`  (Use this file: docker-compose -f ${mergedPath} up -d)`));

  return {
    dockerComposePath: answers.dockerComposePath,
    mergedPath,
  };
}

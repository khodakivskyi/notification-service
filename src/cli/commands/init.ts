import chalk from 'chalk';
import inquirer from 'inquirer';
import { setupQuestions } from '../prompts/questions.js';
import { generateEnvFile, writeEnvFile } from './generate-env.js';
import { testConnections } from './test-connection.js';
import { startDockerContainers } from './setup-docker.js';
import ora from 'ora';
import type { SetupAnswers } from '../prompts/questions.js';
import { generateDockerCompose, handleExistingDockerCompose } from './generate-docker-compose.js';

interface InitOptions {
  dryRun?: boolean;
}

async function initCommand(options: InitOptions = {}): Promise<void> {
  const dryRun = Boolean(options.dryRun);

  console.log(
    chalk.bold.cyan(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║        🚀 NOTIFICATION SERVICE - INTERACTIVE SETUP 🚀        ║
║                                                               ║
║   Turn email delivery into a breeze with one command          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`),
  );

  console.log(
    dryRun
      ? chalk.yellow('⚠️  DRY RUN MODE: no files/services will be changed.\n')
      : chalk.gray('This setup wizard will guide you through configuration.\n'),
  );

  try {
    console.log(chalk.bold('📋 Configuration Questions\n'));
    const answers = (await inquirer.prompt(setupQuestions)) as SetupAnswers;

    let dockerComposeContent = '';
    if (answers.useDocker) {
      console.log(chalk.bold('\n🐳 Preparing docker-compose...\n'));

      if (answers.hasExistingDockerCompose && answers.dockerComposePath) {
        if (dryRun) {
          console.log(
            chalk.yellow(
              `Would merge existing compose: ${answers.dockerComposePath} -> *.with-notification-service.yml`,
            ),
          );
        } else {
          handleExistingDockerCompose(answers);
        }
      } else {
        dockerComposeContent = generateDockerCompose(answers);
        if (dryRun) {
          console.log(chalk.bold('----- docker-compose.yml (preview) -----'));
          console.log(dockerComposeContent);
          console.log(chalk.bold('----------------------------------------\n'));
        } else {
          writeEnvFile(dockerComposeContent, 'docker-compose.yml');
          console.log(chalk.green('✓ docker-compose.yml created\n'));
        }
      }
    }

    console.log(chalk.bold('\n📝 Generating .env file...\n'));
    const envContent = generateEnvFile(answers);

    if (dryRun) {
      console.log(chalk.green('✓ .env preview generated\n'));
      console.log(chalk.bold('----- .env (preview) -----'));
      console.log(envContent);
      console.log(chalk.bold('--------------------------\n'));
      showSummary(answers, { database: false, rabbitmq: false, smtp: true }, { dryRun: true });
      return;
    }

    const envWritten = writeEnvFile(envContent);
    if (!envWritten) {
      console.log(chalk.red('✗ Failed to write .env file'));
      process.exit(1);
    }
    console.log(chalk.green('✓ .env file created\n'));

    if (answers.useDocker && answers.startDocker) {
      console.log(chalk.bold('🐳 Docker Setup\n'));
      const dockerStarted = await startDockerContainers();
      if (!dockerStarted) console.log(chalk.yellow('\n⚠️  Skipping Docker containers'));
      console.log();
    }

    const dbHost = answers.useDocker ? 'db' : answers.dbHost || 'localhost';
    const dbPort = answers.useDocker ? '5432' : answers.dbPort || '5432';
    const dbUser = answers.dbUser || 'postgres';
    const dbPassword = answers.dbPassword || 'postgres';

    const rabbitHost = answers.useDocker ? 'rabbitmq' : answers.rabbitHost || 'localhost';
    const rabbitPort = answers.useDocker ? '5672' : answers.rabbitPort || '5672';
    const rabbitUser = answers.rabbitUser || 'guest';
    const rabbitPassword = answers.rabbitPassword || 'guest';

    const connectionConfig = {
      database: {
        url: `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${answers.dbName}`,
      },
      rabbitmq: { url: `amqp://${rabbitUser}:${rabbitPassword}@${rabbitHost}:${rabbitPort}` },
      smtp: {
        host:
          answers.smtpProvider === 'gmail'
            ? 'smtp.gmail.com'
            : answers.smtpProvider === 'custom'
              ? answers.smtpHost || 'localhost'
              : 'smtp.mailtrap.io',
        port: Number.parseInt(
          answers.smtpProvider === 'gmail'
            ? '587'
            : answers.smtpProvider === 'custom'
              ? answers.smtpPort || '587'
              : '2525',
          10,
        ),
        user: answers.smtpUser,
        pass: answers.smtpPassword,
      },
    };

    console.log(chalk.bold('🧪 Testing Connections\n'));
    const connections = await testConnections(connectionConfig);
    console.log();

    if (!connections.database || !connections.rabbitmq) {
      console.log(
        chalk.yellow('⚠️  Some services are not ready yet. They may take a moment to start.'),
      );
    }

    if (answers.runMigrations && connections.database) {
      console.log(chalk.bold('\n🔄 Running Database Migrations\n'));
      const migrationSpinner = ora('Applying migrations...').start();
      try {
        const { runMigrations } = await import('../../utils/migrationRunner.js');
        await runMigrations();
        migrationSpinner.succeed(chalk.green('✓ Migrations completed'));
      } catch (error: unknown) {
        migrationSpinner.fail(
          chalk.red(
            `✗ Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          ),
        );
      }
    }

    showSummary(answers, connections);
  } catch (error: unknown) {
    console.error(
      chalk.red('\n✗ Setup failed:'),
      error instanceof Error ? error.message : 'Unknown error',
    );
    process.exit(1);
  }
}

export default initCommand;

function showSummary(
  answers: SetupAnswers,
  connections: { database: boolean; rabbitmq: boolean; smtp: boolean },
  options: { dryRun?: boolean } = {},
): void {
  console.log(
    chalk.bold.green(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║                    ✅ SETUP COMPLETED ✅                      ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
`),
  );

  console.log(chalk.bold('📊 Configuration Summary:\n'));
  const table = [
    ['Project', answers.projectName],
    ['Environment', answers.environment],
    ['Port', answers.port],
    ['Docker', answers.useDocker ? '✓ Enabled' : '✗ Disabled'],
    ['Database', connections.database ? '✓ Connected' : '✗ Not connected'],
    ['RabbitMQ', connections.rabbitmq ? '✓ Connected' : '✗ Not connected'],
    ['SMTP', connections.smtp ? '✓ Configured' : '✗ Not configured'],
    ['Rate Limiting', answers.enableRateLimit ? '✓ Enabled' : '✗ Disabled'],
    ['API Key', answers.enableApiKey ? '✓ Enabled' : '✗ Disabled'],
  ];
  console.log(table.map(([k, v]) => `  ${chalk.cyan(String(k).padEnd(20))} ${v}`).join('\n'));

  if (options.dryRun) {
    console.log(
      chalk.yellow('\nℹ️  Dry run finished. No files were written, no services started.\n'),
    );
    return;
  }

  console.log(chalk.bold('\n🚀 Next Steps:\n'));
  console.log(chalk.white('  npm run dev'));
}

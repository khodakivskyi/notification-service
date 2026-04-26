import pg from 'pg';
import amqplib from 'amqplib';
import chalk from 'chalk';
import ora from 'ora';

interface ConnectionConfig {
  database: {
    url: string;
  };
  rabbitmq: {
    url: string;
  };
  smtp: {
    host: string;
    port: number;
    user: string;
    pass: string;
  };
}

export async function testConnections(config: ConnectionConfig): Promise<{
  database: boolean;
  rabbitmq: boolean;
  smtp: boolean;
}> {
  const results = { database: false, rabbitmq: false, smtp: false };

  const dbSpinner = ora('Testing PostgreSQL connection...').start();
  try {
    const client = new pg.Client(config.database.url);
    await client.connect();
    await client.query('SELECT NOW()');
    await client.end();
    dbSpinner.succeed(chalk.green('✓ PostgreSQL connection successful'));
    results.database = true;
  } catch (error: any) {
    dbSpinner.fail(chalk.red(`✗ PostgreSQL connection failed: ${error.message}`));
  }

  const mqSpinner = ora('Testing RabbitMQ connection...').start();
  try {
    const connection = await amqplib.connect(config.rabbitmq.url);
    await connection.close();
    mqSpinner.succeed(chalk.green('✓ RabbitMQ connection successful'));
    results.rabbitmq = true;
  } catch (error: any) {
    mqSpinner.fail(chalk.red(`✗ RabbitMQ connection failed: ${error.message}`));
  }

  const smtpSpinner = ora('Testing SMTP configuration...').start();
  try {
    if (config.smtp.host && config.smtp.port && config.smtp.user) {
      smtpSpinner.succeed(chalk.green('✓ SMTP configuration valid'));
      results.smtp = true;
    } else {
      smtpSpinner.fail(chalk.red('✗ SMTP configuration incomplete'));
    }
  } catch (error: any) {
    smtpSpinner.fail(chalk.red(`✗ SMTP test failed: ${error.message}`));
  }

  return results;
}

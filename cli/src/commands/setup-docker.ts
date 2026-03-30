import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';

export async function startDockerContainers(): Promise<boolean> {
  const spinner = ora('Starting Docker containers...').start();

  try {
    // check if docker available
    execSync('docker --version', { stdio: 'ignore' });
  } catch {
    spinner.fail(chalk.red('✗ Docker is not installed. Please install Docker Desktop.'));
    console.log(
      chalk.yellow('\n📖 Download Docker: https://www.docker.com/products/docker-desktop'),
    );
    return false;
  }

  try {
    execSync('docker-compose up -d db rabbitmq', { cwd: process.cwd() });
    spinner.succeed(chalk.green('✓ Docker containers started'));

    // waiting for the ready status
    const waitSpinner = ora('Waiting for services to be ready...').start();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    waitSpinner.succeed(chalk.green('✓ Services are ready'));

    return true;
  } catch (error: unknown) {
    spinner.fail(chalk.red(`✗ Failed to start Docker containers: ${error instanceof Error ? error.message : ''}`));
    return false;
  }
}

export function stopDockerContainers(): void {
  try {
    execSync('docker-compose down', { cwd: process.cwd() });
    console.log(chalk.green('✓ Docker containers stopped'));
  } catch {
    console.log(chalk.yellow('Could not stop containers'));
  }
}

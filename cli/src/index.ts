#!/usr/bin/env node

import initCommand from './commands/init.js';

function parseArgs(argv: string[]) {
  const dryRun = argv.includes('--dry-run');

  const command = argv.find((arg) => !arg.startsWith('-')) || 'init';

  return { command, dryRun };
}

async function main() {
  const { command, dryRun } = parseArgs(process.argv.slice(2));

  switch (command) {
    case 'init':
      await initCommand({ dryRun });
      break;
    case '--version':
    case '-v':
    case 'version':
      console.log('1.0.0');
      break;
    case '--help':
    case '-h':
    case 'help':
      console.log(`
Usage: notification-service [command] [options]

Commands:
  init             Interactive setup wizard (default)
  version          Show version
  help             Show help

Options:
  --dry-run        Preview .env and flow without writing files or running services
  -v, --version    Show version
  -h, --help       Show help

Examples:
  notification-service init
  notification-service init --dry-run
  notification-service --dry-run init
  npx notification-service init --dry-run
      `);
      break;
    default:
      console.error(`Unknown command: ${command}`);
      console.error('Run \'notification-service --help\' to see available commands.');
      process.exit(1);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});

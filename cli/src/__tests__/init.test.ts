import { describe, it, expect, vi, beforeEach } from 'vitest';

const promptMock = vi.fn();
const generateEnvFileMock = vi.fn();
const writeEnvFileMock = vi.fn();
const testConnectionsMock = vi.fn();
const startDockerContainersMock = vi.fn();
const runMigrationsMock = vi.fn();

const errorMock = vi.spyOn(console, 'error').mockImplementation(() => {});
const processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => undefined) as never);

const spinnerFactory = vi.fn();
const spinnerStart = vi.fn();
const spinnerSucceed = vi.fn();
const spinnerFail = vi.fn();

vi.mock('inquirer', () => ({
  default: { prompt: (...args: unknown[]) => promptMock(...args) },
}));

vi.mock('../cli/commands/generate-env.js', () => ({
  generateEnvFile: (...args: unknown[]) => generateEnvFileMock(...args),
  writeEnvFile: (...args: unknown[]) => writeEnvFileMock(...args),
}));

vi.mock('../cli/commands/test-connection.js', () => ({
  testConnections: (...args: unknown[]) => testConnectionsMock(...args),
}));

vi.mock('../cli/commands/setup-docker.js', () => ({
  startDockerContainers: (...args: unknown[]) => startDockerContainersMock(...args),
}));

vi.mock('../utils/migrationRunner.js', () => ({
  runMigrations: (...args: unknown[]) => runMigrationsMock(...args),
}));

vi.mock('ora', () => ({
  default: (...args: unknown[]) => spinnerFactory(...args),
}));

const answers = {
  projectName: 'Test App',
  environment: 'development',
  port: '3001',
  useDocker: true,
  dbName: 'notifications',
  smtpProvider: 'mailtrap',
  smtpUser: 'user',
  smtpPassword: 'pass',
  senderEmail: 'noreply@example.com',
  enableRateLimit: false,
  enableApiKey: true,
  startDocker: true,
  runMigrations: true,
};

describe('initCommand', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    spinnerStart.mockReturnValue({ succeed: spinnerSucceed, fail: spinnerFail });
    spinnerFactory.mockReturnValue({ start: spinnerStart });

    promptMock.mockResolvedValue(answers);
    generateEnvFileMock.mockReturnValue('ENV=1');
    writeEnvFileMock.mockReturnValue(true);
    startDockerContainersMock.mockResolvedValue(true);
    testConnectionsMock.mockResolvedValue({ database: true, rabbitmq: true, smtp: true });
    runMigrationsMock.mockResolvedValue(undefined);
  });

  it('dry-run should not write file, start docker, test connections or run migrations', async () => {
    const mod = await import('../cli/commands/init.js');
    await mod.default({ dryRun: true });

    expect(promptMock).toHaveBeenCalled();
    expect(generateEnvFileMock).toHaveBeenCalled();
    expect(writeEnvFileMock).not.toHaveBeenCalled();
    expect(startDockerContainersMock).not.toHaveBeenCalled();
    expect(testConnectionsMock).not.toHaveBeenCalled();
    expect(runMigrationsMock).not.toHaveBeenCalled();
  });

  it('normal flow should write env, start docker, test connections, run migrations', async () => {
    const mod = await import('../cli/commands/init.js');
    await mod.default({ dryRun: false });

    expect(writeEnvFileMock).toHaveBeenCalledWith('ENV=1');
    expect(startDockerContainersMock).toHaveBeenCalled();
    expect(testConnectionsMock).toHaveBeenCalled();
    expect(runMigrationsMock).toHaveBeenCalled();
  });

  it('should exit when writeEnvFile returns false', async () => {
    writeEnvFileMock.mockReturnValue(false);

    const mod = await import('../src/commands/init.js');
    await mod.default({ dryRun: false });

    expect(processExitSpy).toHaveBeenCalledWith(1);
  });

  it('should skip migrations when database connection is false', async () => {
    testConnectionsMock.mockResolvedValue({ database: false, rabbitmq: true, smtp: true });

    const mod = await import('../cli/commands/init.js');
    await mod.default({ dryRun: false });

    expect(runMigrationsMock).not.toHaveBeenCalled();
  });

  it('should handle unexpected error and exit(1)', async () => {
    promptMock.mockRejectedValue(new Error('boom'));

    const mod = await import('../cli/commands/init.js');
    await mod.default({ dryRun: false });

    expect(errorMock).toHaveBeenCalled();
    expect(processExitSpy).toHaveBeenCalledWith(1);
  });
});

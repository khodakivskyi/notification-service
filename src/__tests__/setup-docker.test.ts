import { describe, it, expect, vi, beforeEach } from 'vitest';

const execSyncMock = vi.fn();
const logMock = vi.spyOn(console, 'log').mockImplementation(() => {});

const spinnerFactory = vi.fn();
const spinnerStart = vi.fn();
const spinnerSucceed = vi.fn();
const spinnerFail = vi.fn();

vi.mock('child_process', () => ({
  execSync: (...args: unknown[]) => execSyncMock(...args),
}));

vi.mock('ora', () => ({
  default: (...args: unknown[]) => spinnerFactory(...args),
}));

describe('setup-docker', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

    spinnerStart.mockReturnValue({
      succeed: spinnerSucceed,
      fail: spinnerFail,
    });

    spinnerFactory.mockReturnValue({
      start: spinnerStart,
    });
  });

  it('startDockerContainers returns false if docker is not installed', async () => {
    execSyncMock.mockImplementationOnce(() => {
      throw new Error('docker missing');
    });

    const { startDockerContainers } = await import('../cli/commands/setup-docker.js');
    const result = await startDockerContainers();

    expect(result).toBe(false);
    expect(execSyncMock).toHaveBeenCalledWith('docker --version', { stdio: 'ignore' });
    expect(spinnerFail).toHaveBeenCalled();
    expect(logMock).toHaveBeenCalled();
  });

  it('startDockerContainers returns true on success path', async () => {
    vi.useFakeTimers();

    execSyncMock
      .mockImplementationOnce(() => undefined) // docker --version
      .mockImplementationOnce(() => undefined); // docker-compose up

    const { startDockerContainers } = await import('../cli/commands/setup-docker.js');
    const promise = startDockerContainers();

    await vi.advanceTimersByTimeAsync(3000);
    const result = await promise;

    expect(result).toBe(true);
    expect(execSyncMock).toHaveBeenNthCalledWith(1, 'docker --version', { stdio: 'ignore' });
    expect(execSyncMock).toHaveBeenNthCalledWith(2, 'docker-compose up -d db rabbitmq', {
      cwd: process.cwd(),
    });
    expect(spinnerSucceed).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('startDockerContainers returns false if docker-compose up fails', async () => {
    execSyncMock
      .mockImplementationOnce(() => undefined) // docker --version
      .mockImplementationOnce(() => {
        throw new Error('compose failed');
      });

    const { startDockerContainers } = await import('../cli/commands/setup-docker.js');
    const result = await startDockerContainers();

    expect(result).toBe(false);
    expect(spinnerFail).toHaveBeenCalled();
  });

  it('stopDockerContainers success logs success message', async () => {
    execSyncMock.mockImplementationOnce(() => undefined);

    const { stopDockerContainers } = await import('../cli/commands/setup-docker.js');
    stopDockerContainers();

    expect(execSyncMock).toHaveBeenCalledWith('docker-compose down', { cwd: process.cwd() });
    expect(logMock).toHaveBeenCalled();
  });

  it('stopDockerContainers failure logs warning', async () => {
    execSyncMock.mockImplementationOnce(() => {
      throw new Error('down failed');
    });

    const { stopDockerContainers } = await import('../cli/commands/setup-docker.js');
    stopDockerContainers();

    expect(logMock).toHaveBeenCalled();
  });
});

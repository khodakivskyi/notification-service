import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import logger from '../config/logger';
import config from '../config/env';
import { RateLimitError, ServiceUnavailableError } from '../exceptions/';

let rateLimiter: RateLimiterRedis | null = null;

if (config.rateLimiting.redisUrl && config.rateLimiting.rateLimitEnabled) {
  const redisClient = new Redis(config.rateLimiting.redisUrl);

  redisClient.on('connect', () => logger.info('Redis connected successfully.'));
  redisClient.on('error', (error) => logger.error('Redis connection error:', { error: error.message }));

  // Use integers only
  const points = Math.floor(config.rateLimiting.rateLimitPoints) || 100;
  const duration = Math.floor(config.rateLimiting.rateLimitDuration) || 60;
  const blockDuration = Math.floor(config.rateLimiting.rateLimitBlockDuration) || 60;

  rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    keyPrefix: 'rl:notification-service',
    points,
    duration,
    blockDuration,
  });
}

const rateLimitHandler = (req: Request, _res: Response, next: NextFunction) => {
  const skipPaths = ['/api/health', '/api/ready', '/favicon.ico'];
  if (!rateLimiter || skipPaths.some((p) => req.path === p || req.path.startsWith(p))) return next();

  const key = (req.headers['x-api-key'] as string) || req.ip || 'anonymous';
  rateLimiter
    .consume(key)
    .then(() => {
      next();
    })
    .catch((error: unknown) => {
      // Rate limit error
      if (error && typeof error === 'object' && !(error instanceof Error) && 'msBeforeNext' in error) {
        const retryAfterSec = Math.ceil((error as { msBeforeNext: number }).msBeforeNext / 1000);
        next(new RateLimitError(Math.max(1, retryAfterSec)));
        return;
      }
      // Redis error
      logger.error('Rate limiter store error (Redis)', { error: error instanceof Error ? error.message : error });
      next(new ServiceUnavailableError('rate-limit-store', error instanceof Error ? error : undefined));
    });
};

export default rateLimitHandler;

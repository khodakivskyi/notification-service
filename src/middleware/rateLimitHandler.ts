import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import logger from '../config/logger';
import config from '../config/env';
import { RateLimitError } from '../exceptions/';

let rateLimiter;

if (config.rateLimiting.redisUrl && config.rateLimiting.rateLimitEnabled) {
  const redisClient = new Redis(config.rateLimiting.redisUrl);

  redisClient.on('connect', () => logger.info('Redis connected successfully.'));
  redisClient.on('error', (error) => logger.error('Redis connection error:', { error: error.message }));

  rateLimiter = new RateLimiterRedis({
    storeClient: redisClient,
    points: config.rateLimiting.rateLimitPoints,
    duration: config.rateLimiting.rateLimitDuration,
    blockDuration: config.rateLimiting.rateLimitBlockDuration,
    useRedisPackage: true,
  });
} else {
  rateLimiter = null;
}

const rateLimitHandler = (req: Request, _res: Response, next: NextFunction) => {
  const skipPaths = ['/api/health', '/api/ready', '/favicon.ico'];
  if (!rateLimiter || skipPaths.some((p) => req.path === p || req.path.startsWith(p))) return next();

  const key = (req.headers['x-api-key'] as string) || req.ip || 'anonymous';
  rateLimiter.consume(key)
    .then(() => {
      next();
    })
    .catch(() => {
      next(new RateLimitError(rateLimiter.blockDuration));
    });
};

export default rateLimitHandler;

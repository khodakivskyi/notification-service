import { Request, Response, NextFunction } from 'express';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import Redis from 'ioredis';
import logger from '../config/logger';
import config from '../config/env';
import { RateLimitError } from '../exceptions/';

const redisClient = new Redis(config.rateLimiting.redisUrl);

redisClient.on('connect', () => logger.info('Redis connected successfully.'));
redisClient.on('error', (error) => logger.error('Redis connection error:', { error: error.message }));

const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  points: config.rateLimiting.rateLimitPoints,
  duration: config.rateLimiting.rateLimitDuration,
  blockDuration: config.rateLimiting.rateLimitBlockDuration,
  useRedisPackage: true,
});

const rateLimitHandler = (req: Request, _res: Response, next: NextFunction) => {
  rateLimiter.consume(req.ip as string)
    .then(() => {
      next();
    })
    .catch(() => {
      next(new RateLimitError(rateLimiter.blockDuration));
    });
};

export default rateLimitHandler;

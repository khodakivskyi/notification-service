import { Request, Response, NextFunction } from 'express';
import config from '../config/env.js';
import { UnauthorizedError } from '../exceptions/index.js';

export default function authenticate(req: Request, _res: Response, next: NextFunction) {
  if (!config.apiKey || req.path.startsWith('/api/health')) return next();

  const apiKey = req.header('x-api-key');
  if (!apiKey || apiKey !== config.apiKey) {
    return next(new UnauthorizedError());
  }
  return next();
}
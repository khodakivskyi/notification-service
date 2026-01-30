import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import config from '../config/env';
import { BaseError } from '../exceptions';

/**
 * Centralized error handling
 * This middleware is triggered when we call next(err)
 */
function errorHandler(error: any, req: Request, res: Response, _next: NextFunction): void {
  logger.error('Request error', {
    error: error.message,
    stack: error.stack,
    name: error.name,
    method: req.method,
    path: req.path,
    body: req.body,
    statusCode: error.statusCode || 500,
  });

  if (error instanceof BaseError) {
    res.status(error.statusCode).json(error.toJSON());
    return;
  }

  // Handling specific errors
  // PostgreSQL duplicate key error
  if (error.code === '23505') {
    res.status(409).json({
      error: {
        name: 'ConflictError',
        message: 'Resource already exists',
        statusCode: 409,
        details: error.detail,
      },
    });
    return;
  }

  // PostgreSQL foreign key violation
  if (error.code === '23503') {
    res.status(400).json({
      error: {
        name: 'ValidationError',
        message: 'Referenced resource does not exist',
        statusCode: 400,
      },
    });
    return;
  }

  // Joi validation error
  if (error.name === 'ValidationError' && error.isJoi) {
    res.status(400).json({
      error: {
        name: 'ValidationError',
        message: error.message,
        statusCode: 400,
        details: error.details,
      },
    });
    return;
  }

  // Unexpected error (Internal Server Error)
  const statusCode = error.statusCode || 500;

  res.status(statusCode).json({
    error: {
      name: error.name || 'InternalServerError',
      message: config.env === 'production' ? 'An unexpected error occurred' : error.message,
      statusCode,
      ...(config.env === 'development' && { stack: error.stack }),
    },
  });
}

export default errorHandler;

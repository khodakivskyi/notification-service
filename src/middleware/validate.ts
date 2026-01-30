import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

// Middleware for routes validations
const validate = (schema: Joi.ObjectSchema, source: 'body' | 'params' | 'query' = 'body') => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req[source] = await schema.validateAsync(req[source], { abortEarly: false });
      next();
    } catch (error) {
      next(error);
    }
  };
};

export default validate;

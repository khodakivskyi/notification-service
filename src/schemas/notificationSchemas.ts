import Joi from 'joi';

const uuid = Joi.string().uuid().required();

export const sendNotification = Joi.object({
  email: Joi.string().email().required(),
  subject: Joi.string().required().max(255),
  htmlContent: Joi.string().required(),
  userId: Joi.string().optional(),
  callbackUrl: Joi.string().uri().optional(),
});

export const uuidParam = Joi.object({
  id: uuid,
});

export const userIdParam = Joi.object({
  userId: uuid,
});

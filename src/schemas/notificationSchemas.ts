import Joi from 'joi';

// common rules
const email = Joi.string().email().required();
const uuid = Joi.string().uuid();
const optionalUrl = Joi.string()
  .uri({ scheme: ['http', 'https'] })
  .allow(null, '');

export const sendVerification = Joi.object({
  email: email,
  username: Joi.string().required().min(1).max(255),
  verificationLink: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .required(),
  userId: uuid.optional(),
  subject: Joi.string().max(500).optional(),
  callbackUrl: optionalUrl.optional(),
});

export const sendNotification = Joi.object({
  email: email,
  subject: Joi.string().required().max(500),
  message: Joi.string().required(),
  userId: uuid.optional(),
  callbackUrl: optionalUrl.optional(),
});

export const uuidParam = Joi.object({
  id: uuid.required(),
});

export const userIdParam = Joi.object({
  userId: uuid.required(),
});

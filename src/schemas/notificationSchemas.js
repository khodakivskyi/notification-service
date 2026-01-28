const Joi = require('joi');

// common rules
const email = Joi.string().email().required();
const uuid = Joi.string().uuid();
const optionalUrl = Joi.string().uri({ scheme: ['http', 'https'] }).allow(null, '');

const sendVerification = Joi.object({
    email: email,
    username: Joi.string().required().min(1).max(255),
    verificationLink: Joi.string().uri({ scheme: ['http', 'https'] }).required(),
    userId: uuid.optional(),
    subject: Joi.string().max(500).optional(),
    callbackUrl: optionalUrl.optional(),
});

const sendNotification = Joi.object({
    email: email,
    subject: Joi.string().required().max(500),
    message: Joi.string().required(),
    userId: uuid.optional(),
    callbackUrl: optionalUrl.optional(),
});

const uuidParam = Joi.object({
    id: uuid.required(),
});

const userIdParam = Joi.object({
    userId: uuid.required(),
});

module.exports = {
    sendVerification,
    sendNotification,
    uuidParam,
    userIdParam,
};
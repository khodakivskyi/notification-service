import express from 'express';
import healthRoutes from './routes/health.js';
import notificationRoutes from './routes/notifications.js';
import errorHandler from './middleware/errorHandler.js';
import rateLimitHandler from './middleware/rateLimitHandler.js';
import config from './config/env.js';
import authenticate from './middleware/auth.js';

const app = express();

app.use(express.json());
if (config.apiKey) app.use(authenticate);
if (config.rateLimiting.rateLimitEnabled) app.use(rateLimitHandler);

app.use('/api', healthRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

export default app;

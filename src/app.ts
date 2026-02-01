import express from 'express';
import healthRoutes from './routes/health';
import notificationRoutes from './routes/notifications';
import errorHandler from './middleware/errorHandler';
import rateLimitHandler from './middleware/rateLimitHandler';
import config from './config/env';
import authenticate from './middleware/auth';

const app = express();

app.use(express.json());
if (config.apiKey) app.use(authenticate);
if (config.rateLimiting.rateLimitEnabled) app.use(rateLimitHandler);

app.use('/api', healthRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

export default app;

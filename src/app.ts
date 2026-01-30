import express from 'express';
import healthRoutes from './routes/health';
import notificationRoutes from './routes/notifications';
import errorHandler from './middleware/errorHandler';

const app = express();
app.use(express.json());
app.use('/api', healthRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

export default app;

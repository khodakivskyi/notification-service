import express, { Request, Response } from 'express';
import db from '../config/database';
import rabbitmq from '../config/rabbitmq';

const router = express.Router();

router.get('/health', async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (_req: Request, res: Response) => {
  const checks = {
    rabbitmq: await rabbitmq.checkConnection(),
    database: await db.checkConnection(),
  };

  const allHealthy = Object.values(checks).every((status) => status);

  const statusCode = allHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: allHealthy ? 'READY' : 'NOT_READY',
    checks: checks,
  });
});

export default router;

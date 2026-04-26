import { NotificationRepository } from './repositories/notificationRepository.js';
import { NotificationService } from './services/notificationService.js';
import { EmailTransport } from './services/emailTransport.js';
import { EmailWorker } from './queues/emailWorker.js';

export const notificationRepository = new NotificationRepository();
export const emailTransport = new EmailTransport();
export const notificationService = new NotificationService(notificationRepository);
export const emailWorker = new EmailWorker(notificationService, emailTransport);

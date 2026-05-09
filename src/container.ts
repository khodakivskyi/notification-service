import { EmailChannel } from './channels/emailChannel.js';
import { NotificationRepository } from './repositories/notificationRepository.js';
import { NotificationService } from './services/notificationService.js';
import { EmailTransport } from './services/emailTransport.js';
import { NotificationWorker } from './queues/notificationWorker.js';

export const notificationRepository = new NotificationRepository();
export const emailTransport = new EmailTransport();
export const emailChannel = new EmailChannel(emailTransport);
export const notificationService = new NotificationService(notificationRepository);
export const notificationWorker = new NotificationWorker(notificationService, emailChannel);

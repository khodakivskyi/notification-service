import logger from '../config/logger.js';
import { ServiceUnavailableError } from '../exceptions/index.js';
import type { INotificationChannel } from '../interfaces/INotificationChannel.js';

/**
 * Placeholder for SMS delivery; wire a provider (Twilio, etc.) here.
 */
export class SmsChannel implements INotificationChannel {
  async send(to: string, subject: string, content: string): Promise<void> {
    logger.warn('SMS channel: delivery not implemented', { to, subjectLen: subject.length, contentLen: content.length });
    throw new ServiceUnavailableError('SMS');
  }
}

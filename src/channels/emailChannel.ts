import type { INotificationChannel } from '../interfaces/INotificationChannel.js';
import type { IEmailTransport } from '../interfaces/IEmailTransport.js';

export class EmailChannel implements INotificationChannel {
  constructor(private readonly transport: IEmailTransport) {}

  send(to: string, subject: string, content: string): Promise<void> {
    return this.transport.sendNotification(to, subject, content);
  }
}

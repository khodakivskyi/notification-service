export interface IEmailTransport {
  sendNotification(to: string, subject: string, htmlContent: string): Promise<void>;
}

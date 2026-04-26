import nodemailer, { Transporter } from 'nodemailer';
import logger from '../config/logger.js';
import config from '../config/env.js';
import { validateEmail } from '../helpers/index.js';
import type { IEmailTransport } from '../interfaces/IEmailTransport.js';

class EmailTransport implements IEmailTransport {
  private transporter: Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });

    logger.info('Email transport initialized', { host: config.smtp.host });
  }

  /**
   * Send a regular message
   * @param to - Recipient email
   * @param subject - Subject
   * @param htmlContent - message
   */
  async sendNotification(to: string, subject: string, htmlContent: string): Promise<void> {
    try {
      validateEmail(to);

      const mailOptions = {
        from: config.smtp.user,
        to: to,
        subject: subject,
        html: htmlContent,
      };

      await this.transporter.sendMail(mailOptions);

      logger.info('Notification email sent', { to });
    } catch (error: unknown) {
      logger.error('Error sending notification email', { to, error });
      throw error;
    }
  }
}

export default new EmailTransport();

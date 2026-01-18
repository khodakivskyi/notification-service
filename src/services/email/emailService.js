const nodeMailer = require('nodemailer');
const logger = require('../../config/logger');
const config = require('../../config/env');
const fs = require('fs').promises;
const Handlebars = require('handlebars');
const path = require('path');
const {withRetry} = require('../../utils/retry');
const notificationRepository = require('../../repositories/notificationRepository');
const {ANONYMOUS_USER_ID} = require('../../constants');

/**
 * @typedef {import('../../types/notification').Notification} Notification
 * @typedef {import('../../types/notification').NotificationStats} NotificationStats
 */

class EmailService {
    constructor() {
        this.transporter = nodeMailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
        });

        logger.info('Email service initialized', {host: config.smtp.host});
    }

    /**
     * Render HTML template
     * @param {string} templateName - File name (without . hbs)
     * @param {object} data - Data to replace
     */
    async renderTemplate(templateName, data) {
        try {
            const templatePath = path.join(__dirname, 'templates', `${templateName}.hbs`);

            const templateSource = await fs.readFile(templatePath, 'utf-8');

            const template = Handlebars.compile(templateSource);

            return template(data);
        } catch (err) {
            logger.error('Failed to render email template', {
                templateName,
                error: err.message
            });
            throw err;
        }
    }


    /**
     * Send verification email
     * @param {string} to - Recipient email
     * @param {string} username - Username
     * @param {string} verificationLink - Verification link
     * @param {string|null} userId - User ID
     */
    async sendVerificationEmail(to, username, verificationLink, userId = null) {
        // create notification record in db ('pending' status)
        const notification = await notificationRepository.create({
            userId: userId || ANONYMOUS_USER_ID,
            type: 'email',
            channel: to,
            subject: '✉️ Verify your email address',
            content: `Verification link: ${verificationLink}`,
            metadata: { username, verificationLink },
        });

        return withRetry(async () => {
            try {
                const html = await this.renderTemplate('verification', {
                    username,
                    verificationLink,
                });

                const mailOptions = {
                    from: config.smtp.user,
                    to: to,
                    subject: 'Verify your email',
                    html: html,
                };

                const info = await this.transporter.sendMail(mailOptions);

                await notificationRepository.markAsSent(notification.id);

                logger.info('Verification email sent', {to, messageId: info.messageId});

                return info;
            } catch (error) {
                await notificationRepository.markAsFailed(notification.id, error.message);
                logger.error('Error sending verification email', {to, error});
                throw error;
            }
        });
    }


    /**
     * Send a regular message
     * @param {string} to - Recipient email
     * @param {string} subject - Subject
     * @param {string} message - message
     * @param {string|null} userId - User ID
     */
    async sendNotification(to, subject, message, userId = null) {
        // create notification record in db ('pending' status)
        const notification = await notificationRepository.create({
            userId: userId || ANONYMOUS_USER_ID,
            type: 'email',
            channel: to,
            subject:  subject,
            content: message,
        });

        return withRetry(async () => {
            try {
                const mailOptions = {
                    from: config.smtp.user,
                    to: to,
                    subject: subject,
                    text: message,
                    html: `<p>${message}</p>`,
                };

                const info = await this.transporter.sendMail(mailOptions);

                await notificationRepository.markAsSent(notification.id);

                logger.info('Notification email sent', {to, messageId: info.messageId});
                return info;
            }
            catch (error) {
                await notificationRepository.markAsFailed(notification.id, error.message);
                logger.error('Error sending notification email', {to, error});
                throw error;
            }
        })
    }

    /**
     * Get notification by ID
     * @param {string} id - Notification ID
     * @param {string|null} userId - Optional user ID for access control
     * @returns {Promise<Notification|null>}
     */
    async getById(id, userId = null) {
        const notification = await notificationRepository.getById(id);

        if (!notification) {
            //throw new NotFoundError('Notification not found');
            return null;
        }

        if (userId && notification.userId !== userId) {
            //throw new ForbiddenError('Access denied');
            return null;
        }

        return notification;
    }

    /**
     * Get statistics for user
     * @param {string} id - User ID
     * @returns {Promise<NotificationStats[]|null>}
     */
    async getStatsByUserId(id){
        const stats = await notificationRepository.getStatsByUserId(id);

        if (!stats) {
            //throw new NotFoundError('Notification not found');
            return null;
        }

        return stats;
    }
}

module.exports = new EmailService;

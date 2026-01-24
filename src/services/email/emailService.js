const nodeMailer = require('nodemailer');
const logger = require('../../config/logger');
const config = require('../../config/env');
const fs = require('fs').promises;
const Handlebars = require('handlebars');
const path = require('path');
const notificationRepository = require('../../repositories/notificationRepository');
const {isValidStatusId} = require('../../constants/index');
const {NotFoundError, ValidationError, ForbiddenError} = require('../../exceptions');
const {validateEmail} = require('../../helpers/validation');

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
     */
    async sendVerificationEmail(to, username, verificationLink) {
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

            logger.info('Verification email sent', {to, messageId: info.messageId});
        } catch (error) {
            logger.error('Error sending verification email', {to, error});
            throw error;
        }
    }


    /**
     * Send a regular message
     * @param {string} to - Recipient email
     * @param {string} subject - Subject
     * @param {string} message - message
     */
    async sendNotification(to, subject, message) {
        try {
            const mailOptions = {
                from: config.smtp.user,
                to: to,
                subject: subject,
                text: message,
                html: `<p>${message}</p>`,
            };

            const info = await this.transporter.sendMail(mailOptions);

            logger.info('Notification email sent', {to, messageId: info.messageId});
        } catch (error) {
            logger.error('Error sending notification email', {to, error});
            throw error;
        }
    }

    /**
     * Create a new notification record
     * @param {Object} data - Notification data
     * @param {string} data.userId - User ID
     * @param {string} data.type - Notification type
     * @param {string} data.channel - Delivery channel
     * @param {string} data.subject - Subject
     * @param {string} data.content - Content
     * @param {Object} data.metadata - Metadata
     * @returns {Promise<Notification>}
     */
    async createNotification({userId, type, channel, subject, content, metadata = {}}) {
        // Validate email format if channel is email
        // channel property is delivery address (email, websocket or sth else)
        if (type === 'email' && channel) {
            validateEmail(channel, type);
        }

        return await notificationRepository.create({
            userId,
            type,
            channel,
            subject,
            content,
            metadata
        });
    }

    /**
     * Update notification status
     * @param {string} id - Notification ID
     * @param {number} statusId - Status ID
     * @param {string|null} errorMessage - Optional error message
     * @returns {Promise<void>}
     */
    async updateStatus(id, statusId, errorMessage = null) {
        if (!isValidStatusId(statusId)) {
            throw new NotFoundError('Status', statusId);
        }

        await notificationRepository.updateStatus(id, statusId, errorMessage);
    }

    /**
     * Get notification by ID
     * @param {string} id - Notification ID
     * @param {string|null} userId - Optional user ID for access control
     * @returns {Promise<Notification>}
     * @throws {NotFoundError} If notification not found
     * @throws {ForbiddenError} If user is not authorized to access the notification
     */
    async getById(id, userId = null) {
        if (!id) {
            throw new ValidationError('Notification ID is required');
        }

        const notification = await notificationRepository.getById(id);

        if (!notification) {
            throw new NotFoundError('Notification', id);
        }

        if (userId && notification.userId !== userId) {
            throw new ForbiddenError();
        }

        return notification;
    }

    /**
     * Get statistics for user
     * @param {string} id - User ID
     * @returns {Promise<NotificationStats[]>}
     */
    async getStatsByUserId(id) {
        if (!id) {
            throw new ValidationError('User ID is required');
        }

        const stats = await notificationRepository.getStatsByUserId(id);
        return stats || [];
    }
}

module.exports = new EmailService();

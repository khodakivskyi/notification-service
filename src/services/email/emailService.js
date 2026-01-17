const nodeMailer = require('nodemailer');
const logger = require('../../config/logger');
const config = require('../../config/env');
const fs = require('fs').promises;
const Handlebars = require('handlebars');
const path = require('path');
const {withRetry} = require('../../utils/retry');

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

                logger.info('Verification email sent', {to, messageId: info.messageId});

                return info;
            } catch (error) {
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
     */
    async sendNotification(to, subject, message) {
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

                logger.info('Notification email sent', {to, messageId: info.messageId});
                return info;
            }
            catch (error) {
                logger.error('Error sending notification email', {to, error});
                throw error;
            }
        })
    }
}

module.exports = new EmailService;

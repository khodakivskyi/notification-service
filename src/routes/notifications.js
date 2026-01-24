const express = require('express');
const router = express.Router();
const emailService = require('../services/email/emailService');
const emailQueue = require('../queues/emailQueue');
const {ANONYMOUS_USER_ID} = require("../constants");
const {validateRequiredFields, validateEmail, validateUrl, validateUuid} = require('../helpers/validation');

/**
 * POST /api/notifications/send-verification
 * Send verification email to user
 * @route POST /api/notifications/send-verification
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - Recipient email address
 * @param {string} req.body.username - User's username
 * @param {string} req.body.verificationLink - Email verification link URL
 * @param {string} [req.body.userId] - Optional user UUID
 * @param {string} [req.body.subject] - Optional letter subject
 * @param {string} [req.body.callbackUrl] - Optional callback url
 * @returns {Promise<Object>} 200 - Success response
 * @returns {Promise<Object>} 400 - Missing required fields
 * @returns {Promise<Object>} 500 - Server error
 */
router.post('/send-verification', async (req, res, next) => {
    try{
        const {email, username, verificationLink, userId, subject, callbackUrl} = req.body;

        // Validate required fields
        validateRequiredFields(req.body, ['email', 'username', 'verificationLink']);

        // Validate email format
        validateEmail(email);

        // Validate URLs if provided
        validateUrl(verificationLink, 'verificationLink');
        if (callbackUrl) {
            validateUrl(callbackUrl, 'callbackUrl');
        }

        const notification = await emailService.createNotification({
            userId: userId || ANONYMOUS_USER_ID,
            type: 'email',
            channel: email,
            subject: subject || 'Verify your email address',
            content: `Verification link: ${verificationLink}`,
            metadata: {
                username,
                verificationLink,
                callbackUrl: callbackUrl || null
            },
        });

        await emailQueue.addVerificationEmail({
            to: email,
            username,
            verificationLink,
            userId,
            notificationId: notification.id,
            callbackUrl: callbackUrl || null,
        });

        res.status(202).json({
            success: true,
            message: 'Verification email queued for delivery',
            notificationId: notification.id,
            statusUrl: `/api/notifications/${notification.id}`,
        });
    }
    catch (error) {
        next(error);
    }
});

/**
 * POST /api/notifications/send
 * Send notification email to user
 * @route POST /api/notifications/send
 * @param {Object} req.body - Request body
 * @param {string} req.body.email - Recipient email address
 * @param {string} req.body.subject - Email subject
 * @param {string} req.body.message - Email message content
 * @param {string} [req.body.userId] - Optional user UUID
 * @param {string} [req.body.callbackUrl] - Optional callback url
 * @returns {Promise<Object>} 200 - Success response
 * @returns {Promise<Object>} 400 - Missing required fields
 * @returns {Promise<Object>} 500 - Server error
 */
router.post('/send', async (req, res, next) => {
    try {
        const {email, subject, message, userId, callbackUrl} = req.body;

        // Validate required fields
        validateRequiredFields(req.body, ['email', 'subject', 'message']);

        // Validate email format
        validateEmail(email);

        // Validate callback URL if provided
        if (callbackUrl) {
            validateUrl(callbackUrl, 'callbackUrl');
        }

        const notification = await emailService.createNotification({
            userId: userId || ANONYMOUS_USER_ID,
            type: 'email',
            channel: email,
            subject: subject,
            content: message,
            metadata: {
                callbackUrl: callbackUrl || null
            }
        });

        await emailQueue.addNotificationEmail({
            to: email,
            subject,
            message,
            userId,
            notificationId: notification.id,
            callbackUrl: callbackUrl || null,
        });

        res.status(202).json({
            success: true,
            message: 'Notification queued for delivery',
            notificationId: notification.id,
            statusUrl: `/api/notifications/${notification.id}`,
        });
    }
    catch (error) {
        next(error);
    }
});

/**
 * GET /api/notifications/:id
 * Get notification by ID
 * @route GET /api/notifications/:id
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.id - Notification UUID
 * @returns {Promise<Object>} 200 - Notification data
 * @returns {Promise<Object>} 404 - Notification not found
 * @returns {Promise<Object>} 500 - Server error
 */
router.get('/:id', async (req, res, next) => {
    try{
        const id = req.params.id;
        validateUuid(id, 'id');
        const notification = await emailService.getById(id);

        res.status(200).json({success: true, data: notification});
    }
    catch (error){
        next(error);
    }
});

/**
 * GET /api/notifications/user/:userId/stats
 * Get notification statistics for a user
 * @route GET /api/notifications/user/:userId/stats
 * @param {Object} req.params - Route parameters
 * @param {string} req.params.userId - User UUID
 * @returns {Promise<Object>} 200 - Statistics data (array of stats by type and status)
 * @returns {Promise<Object>} 500 - Server error
 */
router.get('/user/:userId/stats', async (req, res, next) => {
    try {
        const userId = req.params.userId;
        validateUuid(userId, 'userId');
        const stats = await emailService.getStatsByUserId(userId);

        res.status(200).json({success: true, data: stats});
    }
    catch (error) {
        next(error);
    }
});

/**
 * GET /api/notifications/queue/stats
 * Get email queue statistics
 *
 * @route   GET /api/notifications/queue/stats
 * @returns {Promise<Object>} 200 - Queue statistics data
 * @returns {Promise<Object>} 500 - Server error
 */
router.get('/queue/stats', async (req,res, next) => {
    try{
        const stats = await emailQueue.getStats();
        res.status(200).json({success: true, data: stats});
    } catch (error) {
        next(error);
    }
});

module.exports = router;
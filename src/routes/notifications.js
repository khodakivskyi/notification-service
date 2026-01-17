const express = require('express');
const router = express.Router();
const emailService = require('../services/email/emailService');

/**
 * POST /api/notifications/send-verification
 * Body: { "email": "user@example.com", "username":  "John", "verificationLink": "https://..." }
 */
router.post('/send-verification', async (req, res, next) => {
    try{
        const {email, username, verificationLink} = req.body;

        if (!email || !username || !verificationLink) {
            return res.status(400).json({
                error: 'Missing required fields:  email, username, verificationLink'
            });
        }

        await emailService.sendVerificationEmail(email, username, verificationLink);

        res.status(200).json({
            success: true,
            message: 'Verification email sent'
        });
    }
    catch (error) {
        next(error);
    }
});

/**
 * POST /api/notifications/send
 * Body: { "email":  "user@example.com", "subject": "Hello", "message": "..." }
 */
router.post('/send', async (req, res, next) => {
    try {
        const {email, subject, message} = req.body;

        if (!email || !subject || !message) {
            return res.status(400).json({
                error: 'Missing required fields: email, subject, message'
            });
        }

        await emailService.sendNotification(email, subject, message);

        res.status(200).json({
            success: true,
            message: 'Notification sent'
        });
    }
    catch (error) {
        next(error);
    }
});

module.exports = router;
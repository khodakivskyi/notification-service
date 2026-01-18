const express = require('express');
const router = express.Router();
const emailService = require('../services/email/emailService');

/**
 * POST /api/notifications/send-verification
 * Body: { "email": "user@example.com", "username":  "John", "verificationLink": "https://..." }
 */
router.post('/send-verification', async (req, res, next) => {
    try{
        const {email, username, verificationLink, userId} = req.body;

        if (!email || !username || !verificationLink) {
            return res.status(400).json({
                error: 'Missing required fields:  email, username, verificationLink'
            });
        }

        await emailService.sendVerificationEmail(email, username, verificationLink, userId);

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
        const {email, subject, message, userId} = req.body;

        if (!email || !subject || !message) {
            return res.status(400).json({
                error: 'Missing required fields: email, subject, message'
            });
        }

        await emailService.sendNotification(email, subject, message, userId);

        res.status(200).json({
            success: true,
            message: 'Notification sent'
        });
    }
    catch (error) {
        next(error);
    }
});

/** * GET /api/notifications/:id
 * Get notification by ID
 */
router.get('/:id', async (req, res, next) => {
    try{
        const id = req.params.id;
        const notification = await emailService.getById(id);

        if (!notification) {
            return res.status(404).json({error: 'Notification not found'});
        }

        res.status(200).json({success: true, data: notification});
    }
    catch (error){
        next(error);
    }
});

/**
 * GET /api/notifications/user/:userId/stats
 * Get stats for a user
 */
router.get('/user/:userId/stats', async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const stats = await emailService.getStatsByUserId(userId);

        res.status(200).json({success: true, data: stats});
    }
    catch (error) {
        next(error);
    }
});


module.exports = router;
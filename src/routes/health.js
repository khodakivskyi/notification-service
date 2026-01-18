const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
const logger = require('../config/logger');
const config = require('../config/env');
const {database} = require("../config/env");

// GET /health
router.get('/health', async (req, res) => {
    res.status(200).json({
        status: "OK",
        timestamp: new Date().toISOString()
    });
});

// GET /ready
router.get('/ready', async (req, res) => {
    const checks = {
        smtp: await checkSmtp(),
        database: await database.checkConnection(),
    };

    const allHealthy = Object.values(checks).every(status => status === true);

    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
        status: allHealthy ? "READY" : "NOT_READY",
        checks: checks,
    });
});

async function checkSmtp() {
    try{
        /** @type {import('nodemailer').Transporter} */
        const transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.pass,
            },
        });

        await transporter.verify();

        return true;
    }
    catch (error){
        logger.error("SMTP health check failed", {error: error.message});
        return false;
    }
}

module.exports = router;
const express = require('express');
const router = express.Router();
const db = require("../config/database");
const rabbitmq = require("../config/rabbitmq");

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
        rabbitmq: await rabbitmq.checkConnection(),
        database: await db.checkConnection(),
    };

    const allHealthy = Object.values(checks).every(status => status === true);

    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
        status: allHealthy ? "READY" : "NOT_READY",
        checks: checks,
    });
});

module.exports = router;
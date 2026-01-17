const express = require('express');
const healthRoutes = require('./routes/health');
const notificationRoutes = require('./routes/notifications');
const errorHandler = require("./middleware/errorHandler");

const app = express();
app.use(express.json());
app.use('/api', healthRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

module.exports = app;
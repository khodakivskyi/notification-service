const app = require('./app');
const {server} = require('./config/env');
const logger = require('./config/logger');
const emailService = require('./services/email/emailService');

app.listen(server.port, () => {
    logger.info('Server started', {port: server.port});
});
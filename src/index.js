const app = require('./app');
const {server} = require('./config/env');
const logger = require('./config/logger');

app.listen(server.port, () => {
    logger.info('Server started', {port: server.port});
});
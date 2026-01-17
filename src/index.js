const express = require('express');
const {server} = require('./config/env');
const logger = require('./config/logger');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.listen(server.port, () => {
    logger.info('Server started', {port: server.port});
});
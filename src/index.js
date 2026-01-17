const express = require('express');
const {server} = require('./config');
const logger = require('./config/logger');

const port = server.PORT;

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Hello, World!');
});

app.listen(port, () => {
    logger.info('Server started', { port: port });
});
const nodeMailer = require('nodemailer');
const {smtp} = require('../config/env');

const transporter = nodeMailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    auth: {
        user: smtp.user,
        pass: smtp.pass,
    },
});

async function sendEmail(to, subject, text) {
    try{
        await transporter.sendMail({
            from: `"No Reply" <${smtp.user}>`,
            to,
            subject,
            text,
        });
    }
    catch (error) {
        console.error('Error sending email:', error);
    }
}

module.exports = sendEmail;

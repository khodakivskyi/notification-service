const nodeMailer = require('nodemailer');
const {smtp} = require('../config');

const transporter = nodeMailer.createTransport({
    host: smtp.SMTP.host,
    port: smtp.SMTP.port,
    secure: smtp.SMTP.port === 465,
    auth: {
        user: smtp.SMTP.user,
        pass: smtp.SMTP.pass,
    },
});

async function sendEmail(to, subject, text) {
    try{
        await transporter.sendMail({
            from: `"No Reply" <${smtp.SMTP.user}>`,
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

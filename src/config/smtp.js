if (!process.env.SMTP_USER) throw new Error("SMTP_USER is missing");
if (!process.env.SMTP_PASS) throw new Error("SMTP_PASS is missing");
if (!process.env.SMTP_HOST) throw new Error("SMTP_HOST is missing");

module.exports = {
    SMTP: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    }
};

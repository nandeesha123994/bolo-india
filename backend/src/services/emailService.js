const nodemailer = require("nodemailer");

const smtpPort = Number(process.env.SMTP_PORT || 587);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: smtpPort,
  secure: smtpPort === 465,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  connectionTimeout: 5000,
  greetingTimeout: 5000,
  socketTimeout: 10000,
});

const sendEmail = async ({ to, subject, text, html }) => {
  await transporter.sendMail({
    from: `"Bolo India" <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html,
  });
};

module.exports = {
  sendEmail,
};

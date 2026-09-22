const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
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

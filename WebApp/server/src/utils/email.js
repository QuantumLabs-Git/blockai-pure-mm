const nodemailer = require('nodemailer');

// For development, we'll just log emails
const sendEmail = async ({ to, subject, html }) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('📧 Email would be sent:');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`Content: ${html}`);
    return { success: true };
  }

  // Production email sending
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const info = await transporter.sendMail({
    from: process.env.SMTP_USER,
    to,
    subject,
    html
  });

  return info;
};

module.exports = { sendEmail };
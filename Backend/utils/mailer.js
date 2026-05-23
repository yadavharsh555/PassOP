const nodemailer = require("nodemailer");

let cachedTransporter = null;

/**
 * Get or create Nodemailer SMTP Transporter
 * Safely parses and trims all environment variables to prevent hidden Windows carriage return (\r) bugs.
 */
async function getTransporter() {
  const isSMTPConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;

  if (isSMTPConfigured) {
    if (!cachedTransporter) {
      const host = (process.env.SMTP_HOST || "smtp.gmail.com").trim();
      const rawPort = (process.env.SMTP_PORT || "465").trim();
      const port = parseInt(rawPort, 10);
      const secure = rawPort === "465";
      const user = process.env.SMTP_USER.trim();
      const pass = process.env.SMTP_PASS.trim();

      console.log(`🔧 Creating Nodemailer SMTP Transporter to [${host}:${port}] (Secure SSL: ${secure})...`);

      cachedTransporter = nodemailer.createTransport({
        host,
        port,
        secure,
        family: 4, // Force IPv4 to completely bypass Render's IPv6 ENETUNREACH blocks!
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: false, // Prevents certificate self-signed blocks
        },
      });
    }
    return { transporter: cachedTransporter, isRealSMTP: true };
  }

  // Fallback: Ethereal SMTP test account (for development if variables are not set)
  if (!cachedTransporter) {
    console.log("Generating Ethereal SMTP Test Account for real email verification in development...");
    try {
      const testAccount = await nodemailer.createTestAccount();
      cachedTransporter = nodemailer.createTransport({
        host: testAccount.smtp.host,
        port: testAccount.smtp.port,
        secure: testAccount.smtp.secure,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.error("Failed to create Ethereal SMTP test account:", err.message);
      return { transporter: null, isRealSMTP: false };
    }
  }

  return { transporter: cachedTransporter, isRealSMTP: false };
}

/**
 * Send an email with OTP
 * @param {string} to Receiver's email
 * @param {string} subject Email subject
 * @param {string} otp 6-digit OTP code
 * @param {string} purpose Description of purpose
 */
async function sendOTPEmail(to, subject, otp, purpose) {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #1e293b; background-color: #0b1329; color: #f8fafc; border-radius: 12px;">
      <h2 style="color: #10b981; text-align: center; font-size: 24px; font-weight: bold;">PassOP Secure Vault</h2>
      <p style="font-size: 16px; line-height: 1.5; color: #cbd5e1;">Hi there,</p>
      <p style="font-size: 16px; line-height: 1.5; color: #cbd5e1;">You requested a code for <strong>${purpose}</strong>. Please use the following 6-digit One-Time Password (OTP) to complete the action:</p>
      
      <div style="background-color: #020617; border: 1px solid #334155; padding: 15px; text-align: center; border-radius: 8px; margin: 25px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #34d399; font-family: monospace;">${otp}</span>
      </div>
      
      <p style="font-size: 13px; color: #64748b; line-height: 1.4;">This OTP code is highly sensitive and is valid for exactly <strong>10 minutes</strong>. Do not share this code with anyone. Our support will never ask for this code.</p>
      <hr style="border: 0; border-top: 1px solid #1e293b; margin: 20px 0;" />
      <p style="font-size: 11px; text-align: center; color: #475569;">PassOP • Zero-Knowledge Secure Password Manager</p>
    </div>
  `;

  console.log("\n==================================================");
  console.log(`🔑 SECURITY ACTION REQUIRED: ${purpose.toUpperCase()}`);
  console.log(`📧 Target Email: ${to}`);
  console.log(`🔢 One-Time Password (OTP): [ ${otp} ]`);
  console.log("==================================================");

  // Use standard SMTP transporter
  const { transporter, isRealSMTP } = await getTransporter();

  if (!transporter) {
    console.warn("⚠️ SMTP could not be configured. OTP is printed in console above.");
    return false;
  }

  try {
    const smtpUser = (process.env.SMTP_USER || "").trim();
    const info = await transporter.sendMail({
      from: isRealSMTP ? `"PassOP Vault" <${smtpUser}>` : '"PassOP Test Vault" <no-reply@passop.com>',
      to,
      subject,
      html: htmlContent,
    });

    if (isRealSMTP) {
      console.log(`SUCCESS: SMTP email delivered to ${to}`);
    } else {
      const emailPreviewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`📧 REAL EMAIL SENT (via Ethereal test inbox)!`);
      console.log(`🔗 Click this link to view your real HTML email in the browser:`);
      console.log(`👉 ${emailPreviewUrl}`);
      console.log("==================================================\n");
    }
    return true;
  } catch (error) {
    console.error(`FAILURE: Failed to send SMTP email:`, error.message);
    return false;
  }
}

module.exports = {
  sendOTPEmail,
};

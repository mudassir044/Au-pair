"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
exports.verifyEmailConnection = verifyEmailConnection;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Create reusable transporter with proper error handling
const transporter = nodemailer_1.default.createTransporter({
    host: process.env.EMAIL_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.EMAIL_PORT || "587"),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
        user: process.env.EMAIL_USER || "ethereal.user@ethereal.email",
        pass: process.env.EMAIL_PASSWORD || "ethereal.pass",
    },
    // Add this to handle connection issues better
    tls: {
        rejectUnauthorized: false,
    },
});
// Verify connection on startup
async function verifyEmailConnection() {
    try {
        await transporter.verify();
        console.log("✅ Email service connection verified");
        return true;
    }
    catch (error) {
        console.error("❌ Email service connection failed:", error);
        return false;
    }
}
// Send verification email with proper error handling
const sendVerificationEmail = async (email, token) => {
    try {
        const frontendUrl = process.env.FRONTEND_URL || "https://au-pair.netlify.app";
        const verificationUrl = `${frontendUrl}/verify-email/${token}`;
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Au Pair Service" <noreply@aupair.com>',
            to: email,
            subject: "Verify Your Email Address",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Welcome to Au Pair Service!</h1>
          <p>Please verify your email address by clicking the link below:</p>
          <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Verify Email
          </a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${verificationUrl}">${verificationUrl}</a></p>
          <p>This link will expire in 24 hours.</p>
          <p>If you didn't create this account, please ignore this email.</p>
        </div>
      `,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`✉️ Verification email sent: ${info.messageId}`);
        return {
            messageId: info.messageId,
            previewUrl: nodemailer_1.default.getTestMessageUrl(info),
        };
    }
    catch (error) {
        console.error("❌ Failed to send verification email:", error);
        throw error; // Rethrow for handling by caller
    }
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = async (email, token) => {
    try {
        const frontendUrl = process.env.FRONTEND_URL || "https://au-pair.netlify.app";
        const resetUrl = `${frontendUrl}/reset-password/${token}`;
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Au Pair Service" <noreply@aupair.com>',
            to: email,
            subject: "Reset Your Password",
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1>Password Reset Request</h1>
          <p>You requested to reset your password. Click the button below to proceed:</p>
          <a href="${resetUrl}" style="background-color: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
            Reset Password
          </a>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p><a href="${resetUrl}">${resetUrl}</a></p>
          <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
        </div>
      `,
        };
        const info = await transporter.sendMail(mailOptions);
        console.log(`✉️ Password reset email sent: ${info.messageId}`);
        return {
            messageId: info.messageId,
            previewUrl: nodemailer_1.default.getTestMessageUrl(info),
        };
    }
    catch (error) {
        console.error("❌ Failed to send password reset email:", error);
        throw error; // Rethrow for handling by caller
    }
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
//# sourceMappingURL=email.js.map
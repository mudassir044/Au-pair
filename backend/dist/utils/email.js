"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendPasswordResetEmail = exports.sendVerificationEmail = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
// Create reusable transporter for development (will be replaced with real SMTP in production)
const transporter = nodemailer_1.default.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
        user: 'ethereal.user@ethereal.email',
        pass: 'ethereal.pass'
    }
});
const sendVerificationEmail = async (email, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL}/auth/verify?token=${token}`;
    const mailOptions = {
        from: '"Au Pair Connect" <noreply@aupairconnect.com>',
        to: email,
        subject: 'Verify Your Email Address',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Au Pair Connect!</h2>
        <p>Please click the button below to verify your email address:</p>
        <a href="${verificationUrl}" style="background-color: #4CAF50; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Verify Email
        </a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${verificationUrl}">${verificationUrl}</a></p>
        <p>This link will expire in 24 hours.</p>
      </div>
    `
    };
    const info = await transporter.sendMail(mailOptions);
    return {
        messageId: info.messageId,
        previewUrl: nodemailer_1.default.getTestMessageUrl(info)
    };
};
exports.sendVerificationEmail = sendVerificationEmail;
const sendPasswordResetEmail = async (email, token) => {
    const resetUrl = `${process.env.FRONTEND_URL}/auth/reset-password?token=${token}`;
    const mailOptions = {
        from: '"Au Pair Connect" <noreply@aupairconnect.com>',
        to: email,
        subject: 'Reset Your Password',
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to proceed:</p>
        <a href="${resetUrl}" style="background-color: #ff6b6b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
          Reset Password
        </a>
        <p>If the button doesn't work, copy and paste this link into your browser:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link will expire in 1 hour. If you didn't request this, please ignore this email.</p>
      </div>
    `
    };
    const info = await transporter.sendMail(mailOptions);
    return {
        messageId: info.messageId,
        previewUrl: nodemailer_1.default.getTestMessageUrl(info)
    };
};
exports.sendPasswordResetEmail = sendPasswordResetEmail;
//# sourceMappingURL=email.js.map
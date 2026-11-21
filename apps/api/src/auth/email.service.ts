import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465, // true for 465, false for 587 (STARTTLS)
        auth: {
          user,
          pass,
        },
        tls: {
          rejectUnauthorized: true,
          minVersion: 'TLSv1.2',
        },
      });
      this.logger.log(`[SMTP] Initialized transporter with host: ${host}:${port} for user: ${user}`);
    } else {
      this.transporter = null;
      this.logger.warn('[SMTP] SMTP credentials not fully configured; falling back to safe simulation logging.');
    }
  }

  private getAppUrl(): string {
    return (
      process.env.FRONTEND_URL ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.APP_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://www.askrevdrive.com'
        : 'http://localhost:3000')
    ).replace(/\/$/, '');
  }

  private getFromAddress(): string {
    return process.env.SMTP_FROM || 'ASKR EV <no-reply@askrevdrive.com>';
  }

  /**
   * Verifies SMTP connection and authentication with the upstream provider.
   */
  async verifyConnection(): Promise<{ success: boolean; message: string }> {
    if (!this.transporter) {
      this.initTransporter();
    }
    if (!this.transporter) {
      return { success: false, message: 'SMTP transporter not initialized (missing environment variables).' };
    }
    try {
      await this.transporter.verify();
      return { success: true, message: 'SMTP connection and authentication verified successfully.' };
    } catch (err: any) {
      const errMsg = `SMTP verify failed: ${err.message || err}`;
      this.logger.error(`[SMTP_VERIFY_ERROR] ${errMsg}`);
      return { success: false, message: errMsg };
    }
  }

  /**
   * Dispatches a password reset email to a member.
   * Real SMTP delivery is performed whenever SMTP is configured.
   * COMPLIANCE_MODE=SIMULATION_ONLY does NOT disable real security/auth emails.
   */
  async sendPasswordResetEmail(toEmail: string, recipientName: string, rawToken: string): Promise<boolean> {
    const appUrl = this.getAppUrl();
    const resetUrl = `${appUrl}/auth/reset-password?token=${encodeURIComponent(rawToken)}`;
    const maskedEmail = toEmail.replace(/(?<=^.{2}).(?=.*@)/g, '*');

    if (!this.transporter) {
      this.initTransporter();
    }

    if (this.transporter) {
      try {
        const from = this.getFromAddress();
        const info = await this.transporter.sendMail({
          from,
          to: toEmail,
          subject: 'Reset Your ASKR EV Account Password',
          text: `Hello ${recipientName || 'Member'},\n\nYou requested a password reset for your ASKR EV account.\n\nPlease reset your password using the following link:\n${resetUrl}\n\nThis link is valid for 15 minutes and can only be used once.\n\nIf you did not request this reset, please disregard this email.\n\nBest regards,\nASKR EV Security Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #165DAD; margin-top: 0;">ASKR EV Mobility</h2>
              <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
              <p>We received a request to reset your ASKR EV member account password.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetUrl}" style="background-color: #165DAD; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
              </div>
              <p style="font-size: 13px; color: #64748b;">
                This single-use link will expire in <strong>15 minutes</strong>.<br/>
                If the button above does not work, copy and paste this URL into your browser:<br/>
                <a href="${resetUrl}" style="color: #165DAD; word-break: break-all;">${resetUrl}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 11px; color: #94a3b8; margin-bottom: 0;">If you did not request a password reset, you can safely ignore this email. Your account remains secure.</p>
            </div>
          `,
        });

        this.logger.log(`[SMTP] Password reset email successfully delivered to ${maskedEmail} (MessageId: ${info.messageId})`);
        return true;
      } catch (err: any) {
        this.logger.error(`[SMTP_ERROR] Failed to send password reset email to ${maskedEmail}: ${err.message}`, err.stack);
        return false;
      }
    }

    // Fallback: Simulation logging when SMTP is not configured
    this.logger.log(
      `[SIMULATION_EMAIL] Password Reset Email queued for ${recipientName} <${maskedEmail}>. Action URL generated: ${appUrl}/auth/reset-password?token=[PROTECTED_TOKEN]`
    );
    return true;
  }

  /**
   * Dispatches an email address verification link to a member.
   */
  async sendEmailVerification(toEmail: string, recipientName: string, rawToken: string): Promise<boolean> {
    const appUrl = this.getAppUrl();
    const verifyUrl = `${appUrl}/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
    const maskedEmail = toEmail.replace(/(?<=^.{2}).(?=.*@)/g, '*');

    if (!this.transporter) {
      this.initTransporter();
    }

    if (this.transporter) {
      try {
        const from = this.getFromAddress();
        const info = await this.transporter.sendMail({
          from,
          to: toEmail,
          subject: 'Verify Your ASKR EV Email Address',
          text: `Hello ${recipientName || 'Member'},\n\nThank you for registering with ASKR EV.\n\nPlease verify your email address using the following link:\n${verifyUrl}\n\nThis link is valid for 24 hours.\n\nBest regards,\nASKR EV Team`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #165DAD; margin-top: 0;">ASKR EV Mobility</h2>
              <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
              <p>Thank you for registering with ASKR EV. Please verify your email address to complete your account setup.</p>
              <div style="text-align: center; margin: 32px 0;">
                <a href="${verifyUrl}" style="background-color: #165DAD; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
              </div>
              <p style="font-size: 13px; color: #64748b;">
                This link will expire in 24 hours.<br/>
                If the button above does not work, copy and paste this URL into your browser:<br/>
                <a href="${verifyUrl}" style="color: #165DAD; word-break: break-all;">${verifyUrl}</a>
              </p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
              <p style="font-size: 11px; color: #94a3b8; margin-bottom: 0;">If you did not create an ASKR EV account, please disregard this email.</p>
            </div>
          `,
        });

        this.logger.log(`[SMTP] Verification email successfully delivered to ${maskedEmail} (MessageId: ${info.messageId})`);
        return true;
      } catch (err: any) {
        this.logger.error(`[SMTP_ERROR] Failed to send verification email to ${maskedEmail}: ${err.message}`, err.stack);
        return false;
      }
    }

    // Fallback: Simulation logging when SMTP is not configured
    this.logger.log(
      `[SIMULATION_EMAIL] Verification Email queued for ${recipientName} <${maskedEmail}>. Action URL generated: ${appUrl}/auth/verify-email?token=[PROTECTED_TOKEN]`
    );
    return true;
  }
}

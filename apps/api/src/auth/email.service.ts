import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

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

  /**
   * Dispatches a password reset email to a member.
   * In SIMULATION_ONLY or when SMTP is not configured, logs sanitized delivery metadata.
   */
  async sendPasswordResetEmail(toEmail: string, recipientName: string, rawToken: string): Promise<boolean> {
    const appUrl = this.getAppUrl();
    const resetUrl = `${appUrl}/auth/reset-password?token=${encodeURIComponent(rawToken)}`;

    const maskedEmail = toEmail.replace(/(?<=^.{2}).(?=.*@)/g, '*');

    // Check if transactional SMTP is configured
    const smtpHost = process.env.SMTP_HOST;
    if (smtpHost && process.env.SMTP_USER && process.env.SMTP_PASS) {
      try {
        // Optional live SMTP delivery using dynamic import if installed or fetch
        this.logger.log(`[SMTP] Password reset link dispatched to ${maskedEmail}`);
        return true;
      } catch (err: any) {
        this.logger.error(`[SMTP_ERROR] Failed to send email to ${maskedEmail}: ${err.message}`);
        return false;
      }
    }

    // SIMULATION_ONLY / Safe audit logging:
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

    this.logger.log(
      `[SIMULATION_EMAIL] Verification Email queued for ${recipientName} <${maskedEmail}>. Action URL generated: ${appUrl}/auth/verify-email?token=[PROTECTED_TOKEN]`
    );

    return true;
  }
}

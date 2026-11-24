import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailDeliveryResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'BREVO_HTTP' | 'SMTP' | 'SIMULATION';
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly HTTP_TIMEOUT_MS = 10000; // Strict 10-second timeout

  constructor() {
    this.initTransporter();
  }

  private initTransporter() {
    // When BREVO_API_KEY is configured, Brevo HTTPS API is used exclusively.
    // Do not initialize SMTP transporter when Brevo API key is present.
    if (process.env.BREVO_API_KEY) {
      this.transporter = null;
      return;
    }

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
      this.logger.log(`[SMTP] Initialized standalone SMTP transporter with host: ${host}:${port} for user: ${user}`);
    } else {
      this.transporter = null;
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

  private getSender(): { name: string; email: string } {
    const rawFrom = process.env.SMTP_FROM || 'ASKR EV <no-reply@askrevdrive.com>';
    const match = rawFrom.match(/^(.*?)\s*<(.+)>$/);
    if (match) {
      return {
        name: match[1].replace(/["']/g, '').trim() || 'ASKR EV',
        email: match[2].trim(),
      };
    }
    return {
      name: 'ASKR EV',
      email: rawFrom.trim(),
    };
  }

  private maskEmail(email: string): string {
    if (!email) return '***';
    return email.replace(/(?<=^.{2}).(?=.*@)/g, '*');
  }

  /**
   * Sanitizes diagnostic error messages to ensure no tokens, credentials or keys are logged.
   */
  private sanitizeError(errMessage: string): string {
    if (!errMessage) return 'Unknown provider error';
    return errMessage
      .replace(/xkeysib-[a-zA-Z0-9_-]+/g, '[REDACTED_API_KEY]')
      .replace(/token=[a-zA-Z0-9_-]+/gi, 'token=[REDACTED_TOKEN]');
  }

  /**
   * Dispatches email via Brevo HTTPS REST API (POST https://api.brevo.com/v3/smtp/email).
   * Runs over HTTPS (port 443) with a strict 10-second timeout.
   */
  private async sendViaBrevoHttp(params: {
    toEmail: string;
    recipientName: string;
    subject: string;
    textContent: string;
    htmlContent: string;
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const apiKey = process.env.BREVO_API_KEY;
    if (!apiKey) {
      return { success: false, error: 'BREVO_API_KEY is not configured' };
    }

    const sender = this.getSender();
    const payload = {
      sender,
      to: [
        {
          email: params.toEmail,
          name: params.recipientName || 'Member',
        },
      ],
      subject: params.subject,
      textContent: params.textContent,
      htmlContent: params.htmlContent,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.HTTP_TIMEOUT_MS);

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const responseText = await response.text();
      let responseData: any = {};
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { raw: responseText };
      }

      if (response.ok || response.status === 201 || response.status === 200) {
        return {
          success: true,
          messageId: responseData.messageId || 'ACCEPTED',
        };
      }

      const rawError = responseData.message || responseData.code || `HTTP ${response.status}`;
      return {
        success: false,
        error: this.sanitizeError(`Brevo API HTTP ${response.status}: ${rawError}`),
      };
    } catch (err: any) {
      if (err.name === 'AbortError' || err.message?.includes('aborted')) {
        return {
          success: false,
          error: `Brevo API request timed out after ${this.HTTP_TIMEOUT_MS / 1000} seconds`,
        };
      }
      return {
        success: false,
        error: this.sanitizeError(`Network error connecting to Brevo API: ${err.message || err}`),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Verifies Brevo API key authentication without sending a real email.
   * When BREVO_API_KEY is configured, uses Brevo HTTPS API exclusively.
   */
  async verifyConnection(): Promise<{ success: boolean; message: string; provider?: string }> {
    const apiKey = process.env.BREVO_API_KEY;

    if (apiKey) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.HTTP_TIMEOUT_MS);

      try {
        // Validate authentication with empty body - Brevo authenticates before parameter validation
        const response = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            'accept': 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
          },
          body: JSON.stringify({}),
          signal: controller.signal,
        });

        // Brevo returns 400 with 'missing_parameter' only when API key is authenticated
        if (response.status === 400) {
          const body = await response.json().catch(() => ({}));
          if (body.code === 'missing_parameter') {
            return {
              success: true,
              message: 'Brevo HTTPS API key authenticated and connection verified successfully (zero emails sent).',
              provider: 'BREVO_HTTP',
            };
          }
        }

        if (response.status === 401 || response.status === 403) {
          const body = await response.json().catch(() => ({}));
          const errMsg = this.sanitizeError(body.message || 'Unauthorized / Invalid API Key');
          this.logger.error(`[BREVO_HTTP_VERIFY_ERROR] ${errMsg}`);
          return {
            success: false,
            message: `Brevo HTTPS API verification failed: ${errMsg}`,
            provider: 'BREVO_HTTP',
          };
        }

        if (response.ok) {
          return {
            success: true,
            message: 'Brevo HTTPS API authenticated and connection verified successfully.',
            provider: 'BREVO_HTTP',
          };
        }

        const body = await response.json().catch(() => ({}));
        return {
          success: false,
          message: this.sanitizeError(`Brevo HTTPS API verification returned status ${response.status}: ${body.message || 'Unknown error'}`),
          provider: 'BREVO_HTTP',
        };
      } catch (err: any) {
        const errMsg = err.name === 'AbortError' ? 'Brevo HTTPS API connection timed out (10s)' : err.message;
        const sanitized = this.sanitizeError(errMsg);
        this.logger.error(`[BREVO_HTTP_VERIFY_ERROR] ${sanitized}`);
        return {
          success: false,
          message: `Brevo HTTPS API verify failed: ${sanitized}`,
          provider: 'BREVO_HTTP',
        };
      } finally {
        clearTimeout(timeoutId);
      }
    }

    // In production, missing BREVO_API_KEY must not silently fall back to simulation or SMTP
    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        message: 'CRITICAL: BREVO_API_KEY is not configured in production environment.',
        provider: 'BREVO_HTTP',
      };
    }

    // Secondary fallback: SMTP Transport for local/non-production testing only
    if (!this.transporter) {
      this.initTransporter();
    }

    if (this.transporter) {
      try {
        await this.transporter.verify();
        return {
          success: true,
          message: 'SMTP connection and authentication verified successfully.',
          provider: 'SMTP',
        };
      } catch (err: any) {
        const errMsg = `SMTP verify failed: ${err.message || err}`;
        this.logger.error(`[SMTP_VERIFY_ERROR] ${errMsg}`);
        return {
          success: false,
          message: errMsg,
          provider: 'SMTP',
        };
      }
    }

    return {
      success: false,
      message: 'Email service not configured (neither BREVO_API_KEY nor SMTP credentials found).',
      provider: 'SIMULATION',
    };
  }

  /**
   * Dispatches a password reset email to a member.
   * When BREVO_API_KEY is configured, Brevo HTTPS API is used exclusively.
   * Never falls back to SMTP after an HTTP API failure.
   * In production, never falls back to simulation mode if BREVO_API_KEY is missing.
   */
  async sendPasswordResetEmail(toEmail: string, recipientName: string, rawToken: string): Promise<boolean> {
    const appUrl = this.getAppUrl();
    const resetUrl = `${appUrl}/auth/reset-password?token=${encodeURIComponent(rawToken)}`;
    const maskedEmail = this.maskEmail(toEmail);

    const subject = 'Reset Your ASKR EV Account Password';
    const textContent = `Hello ${recipientName || 'Member'},\n\nYou requested a password reset for your ASKR EV account.\n\nPlease reset your password using the following link:\n${resetUrl}\n\nThis link is valid for 15 minutes and can only be used once.\n\nIf you did not request this reset, please disregard this email.\n\nBest regards,\nASKR EV Security Team`;
    const htmlContent = `
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
    `;

    // 1. Exclusive: Brevo HTTPS REST API when BREVO_API_KEY is configured
    if (process.env.BREVO_API_KEY) {
      const result = await this.sendViaBrevoHttp({
        toEmail,
        recipientName,
        subject,
        textContent,
        htmlContent,
      });

      if (result.success) {
        this.logger.log(`[BREVO_HTTP] Password reset email accepted by Brevo for delivery to ${maskedEmail} (MessageId: ${result.messageId})`);
        return true;
      }

      // Safe failure: never fall back to SMTP after HTTP API failure
      this.logger.error(`[BREVO_HTTP_ERROR] Failed to send password reset email to ${maskedEmail}: ${result.error}`);
      return false;
    }

    // 2. Production Guard: In production, missing BREVO_API_KEY must not silently fall back
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        `[EMAIL_CONFIG_ERROR] BREVO_API_KEY is missing in production environment. Password reset email to ${maskedEmail} aborted.`
      );
      return false;
    }

    // 3. Non-Production Fallback: Local SMTP Transport (if explicitly configured)
    if (this.transporter) {
      try {
        const from = `${this.getSender().name} <${this.getSender().email}>`;
        const info = await this.transporter.sendMail({
          from,
          to: toEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });

        this.logger.log(`[SMTP] Password reset email accepted by SMTP for delivery to ${maskedEmail} (MessageId: ${info.messageId})`);
        return true;
      } catch (err: any) {
        this.logger.error(`[SMTP_ERROR] Failed to send password reset email to ${maskedEmail}: ${err.message}`, err.stack);
        return false;
      }
    }

    // 4. Non-Production Fallback: Safe Simulation Mode
    this.logger.log(
      `[SIMULATION_EMAIL] Password Reset Email queued for ${recipientName} <${maskedEmail}>. Action URL generated: ${appUrl}/auth/reset-password?token=[PROTECTED_TOKEN]`
    );
    return true;
  }

  /**
   * Dispatches an email address verification link to a member.
   * When BREVO_API_KEY is configured, Brevo HTTPS API is used exclusively.
   * Never falls back to SMTP after an HTTP API failure.
   * In production, never falls back to simulation mode if BREVO_API_KEY is missing.
   */
  async sendEmailVerification(toEmail: string, recipientName: string, rawToken: string): Promise<boolean> {
    const appUrl = this.getAppUrl();
    const verifyUrl = `${appUrl}/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
    const maskedEmail = this.maskEmail(toEmail);

    const subject = 'Verify Your ASKR EV Email Address';
    const textContent = `Hello ${recipientName || 'Member'},\n\nThank you for registering with ASKR EV.\n\nPlease verify your email address using the following link:\n${verifyUrl}\n\nThis link is valid for 24 hours.\n\nBest regards,\nASKR EV Team`;
    const htmlContent = `
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
    `;

    // 1. Exclusive: Brevo HTTPS REST API when BREVO_API_KEY is configured
    if (process.env.BREVO_API_KEY) {
      const result = await this.sendViaBrevoHttp({
        toEmail,
        recipientName,
        subject,
        textContent,
        htmlContent,
      });

      if (result.success) {
        this.logger.log(`[BREVO_HTTP] Verification email accepted by Brevo for delivery to ${maskedEmail} (MessageId: ${result.messageId})`);
        return true;
      }

      // Safe failure: never fall back to SMTP after HTTP API failure
      this.logger.error(`[BREVO_HTTP_ERROR] Failed to send verification email to ${maskedEmail}: ${result.error}`);
      return false;
    }

    // 2. Production Guard: In production, missing BREVO_API_KEY must not silently fall back
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        `[EMAIL_CONFIG_ERROR] BREVO_API_KEY is missing in production environment. Verification email to ${maskedEmail} aborted.`
      );
      return false;
    }

    // 3. Non-Production Fallback: Local SMTP Transport (if explicitly configured)
    if (this.transporter) {
      try {
        const from = `${this.getSender().name} <${this.getSender().email}>`;
        const info = await this.transporter.sendMail({
          from,
          to: toEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });

        this.logger.log(`[SMTP] Verification email accepted by SMTP for delivery to ${maskedEmail} (MessageId: ${info.messageId})`);
        return true;
      } catch (err: any) {
        this.logger.error(`[SMTP_ERROR] Failed to send verification email to ${maskedEmail}: ${err.message}`, err.stack);
        return false;
      }
    }

    // 4. Non-Production Fallback: Safe Simulation Mode
    this.logger.log(
      `[SIMULATION_EMAIL] Verification Email queued for ${recipientName} <${maskedEmail}>. Action URL generated: ${appUrl}/auth/verify-email?token=[PROTECTED_TOKEN]`
    );
    return true;
  }

  /**
   * Feature 5: Voucher Issuance Notification
   * Sandbox email notification for newly granted vouchers.
   */
  async sendVoucherNotification(
    toEmail: string,
    recipientName: string,
    voucherDetails: {
      voucherCode: string;
      category: string;
      valueINR: number;
      expiresAt: string;
    }
  ): Promise<boolean> {
    const maskedEmail = this.maskEmail(toEmail);
    this.logger.log(
      `📧 [UAT Email Sandbox] Voucher Issued Notification -> To: ${recipientName} <${maskedEmail}> | Code: ${voucherDetails.voucherCode} | Category: ${voucherDetails.category} | Value: ₹${voucherDetails.valueINR} | Expiry: ${voucherDetails.expiresAt}`
    );
    return true;
  }
}

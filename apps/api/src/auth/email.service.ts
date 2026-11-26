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
  private readonly recentDispatches = new Map<string, number>();
  private readonly DUP_WINDOW_MS = 30000; // 30-second duplicate suppression window

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
   * Prevents rapid duplicate email dispatch to the same recipient for the same event.
   */
  private isDuplicate(key: string): boolean {
    const now = Date.now();
    const lastTime = this.recentDispatches.get(key);
    if (lastTime && now - lastTime < this.DUP_WINDOW_MS) {
      return true;
    }
    this.recentDispatches.set(key, now);

    // Evict old entries to prevent memory growth
    if (this.recentDispatches.size > 1000) {
      for (const [k, t] of this.recentDispatches.entries()) {
        if (now - t > this.DUP_WINDOW_MS) {
          this.recentDispatches.delete(k);
        }
      }
    }
    return false;
  }

  /**
   * Dispatches email via Brevo HTTPS REST API (POST https://api.brevo.com/v3/smtp/email).
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
   * Unified dispatcher enforcing Brevo HTTP, production guards, duplicate suppression, and SMTP/Simulation fallbacks.
   */
  private async dispatchEmail(params: {
    eventKey: string;
    toEmail: string;
    recipientName: string;
    subject: string;
    textContent: string;
    htmlContent: string;
    allowDuplicate?: boolean;
  }): Promise<boolean> {
    const maskedEmail = this.maskEmail(params.toEmail);

    if (!params.allowDuplicate && this.isDuplicate(params.eventKey)) {
      this.logger.warn(`[DUPLICATE_SUPPRESSED] Suppressed duplicate email dispatch to ${maskedEmail} for key: ${params.eventKey}`);
      return true;
    }

    // 1. Exclusive: Brevo HTTPS REST API when BREVO_API_KEY is configured
    if (process.env.BREVO_API_KEY) {
      const result = await this.sendViaBrevoHttp({
        toEmail: params.toEmail,
        recipientName: params.recipientName,
        subject: params.subject,
        textContent: params.textContent,
        htmlContent: params.htmlContent,
      });

      if (result.success) {
        this.logger.log(`[BREVO_HTTP] Email '${params.subject}' accepted by Brevo for delivery to ${maskedEmail} (MessageId: ${result.messageId})`);
        return true;
      }

      this.logger.error(`[BREVO_HTTP_ERROR] Failed to send email '${params.subject}' to ${maskedEmail}: ${result.error}`);
      return false;
    }

    // 2. Production Guard: In production, missing BREVO_API_KEY must not silently fall back
    if (process.env.NODE_ENV === 'production') {
      this.logger.error(
        `[EMAIL_CONFIG_ERROR] BREVO_API_KEY is missing in production environment. Email '${params.subject}' to ${maskedEmail} aborted.`
      );
      return false;
    }

    // 3. Non-Production Fallback: Local SMTP Transport (if configured)
    if (this.transporter) {
      try {
        const from = `${this.getSender().name} <${this.getSender().email}>`;
        const info = await this.transporter.sendMail({
          from,
          to: params.toEmail,
          subject: params.subject,
          text: params.textContent,
          html: params.htmlContent,
        });

        this.logger.log(`[SMTP] Email '${params.subject}' accepted by SMTP for delivery to ${maskedEmail} (MessageId: ${info.messageId})`);
        return true;
      } catch (err: any) {
        this.logger.error(`[SMTP_ERROR] Failed to send email '${params.subject}' to ${maskedEmail}: ${err.message}`, err.stack);
        return false;
      }
    }

    // 4. Non-Production Fallback: Safe Simulation Mode
    this.logger.log(
      `[SIMULATION_EMAIL] '${params.subject}' queued for ${params.recipientName} <${maskedEmail}>. Text: ${params.textContent.slice(0, 100)}...`
    );
    return true;
  }

  /**
   * Branded HTML layout wrapper for consistent corporate presentation.
   */
  private wrapTemplate(title: string, bodyContent: string, footerNote?: string): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="border-bottom: 2px solid #165DAD; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="color: #165DAD; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">ASKR EV MOBILITY</h2>
          <p style="color: #64748b; margin: 4px 0 0 0; font-size: 13px; font-weight: 500;">Next-Gen Clean Energy & Community Mobility</p>
        </div>
        <h3 style="color: #0f172a; margin-top: 0; font-size: 18px; font-weight: 700;">${title}</h3>
        <div style="font-size: 14px; line-height: 1.6; color: #334155;">
          ${bodyContent}
        </div>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 28px 0 16px 0;" />
        <p style="font-size: 11px; color: #94a3b8; margin: 0; line-height: 1.5;">
          ${footerNote || 'This is an automated operational notification from ASKR EV Mobility. Please do not reply directly to this email.'}
        </p>
      </div>
    `;
  }

  /**
   * Verifies Brevo API key authentication without sending a real email.
   */
  async verifyConnection(): Promise<{ success: boolean; message: string; provider?: string }> {
    const apiKey = process.env.BREVO_API_KEY;

    if (apiKey) {
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
          body: JSON.stringify({}),
          signal: controller.signal,
        });

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

    if (process.env.NODE_ENV === 'production') {
      return {
        success: false,
        message: 'CRITICAL: BREVO_API_KEY is not configured in production environment.',
        provider: 'BREVO_HTTP',
      };
    }

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

  // =========================================================================
  // 1. New Member Registration
  // =========================================================================
  async sendWelcomeRegistrationEmail(
    toEmail: string,
    recipientName: string,
    memberId: string
  ): Promise<boolean> {
    const appUrl = this.getAppUrl();
    const loginUrl = `${appUrl}/auth/login`;
    const subject = 'Welcome to ASKR EV — Your Member ID and Registration Details';
    const textContent = `Hello ${recipientName || 'Member'},\n\nWelcome to ASKR EV Mobility!\n\nYour Member ID is: ${memberId}\n\nYou can access your dashboard anytime at: ${loginUrl}\n\nBest regards,\nASKR EV Team`;
    const htmlContent = this.wrapTemplate(
      'Welcome to ASKR EV Mobility!',
      `
        <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
        <p>Thank you for joining ASKR EV Mobility. Your account has been registered successfully.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; text-align: center;">
          <div style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Your Member ID</div>
          <div style="font-size: 24px; font-weight: 800; color: #165DAD; letter-spacing: 1px; font-family: monospace; margin-top: 4px;">${memberId}</div>
        </div>
        <p>You can sign in to your Member Portal to track your team, explore our sustainable electric vehicles, and access shopping vouchers.</p>
        <div style="text-align: center; margin: 28px 0;">
          <a href="${loginUrl}" style="background-color: #165DAD; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Access Member Portal</a>
        </div>
      `
    );

    return this.dispatchEmail({
      eventKey: `reg_${toEmail}_${memberId}`,
      toEmail,
      recipientName,
      subject,
      textContent,
      htmlContent,
    });
  }

  // =========================================================================
  // 2. Email Verification & 3. Resend Verification Email
  // =========================================================================
  async sendEmailVerification(toEmail: string, recipientName: string, rawToken: string): Promise<boolean> {
    const appUrl = this.getAppUrl();
    const verifyUrl = `${appUrl}/auth/verify-email?token=${encodeURIComponent(rawToken)}`;
    const subject = 'Verify Your ASKR EV Email Address';
    const textContent = `Hello ${recipientName || 'Member'},\n\nPlease verify your email address using the following link:\n${verifyUrl}\n\nThis link is valid for 24 hours.\n\nBest regards,\nASKR EV Team`;
    const htmlContent = this.wrapTemplate(
      'Verify Your Registered Email Address',
      `
        <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
        <p>Please confirm your registered email address to ensure account security and enable transaction features.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${verifyUrl}" style="background-color: #165DAD; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Verify Email Address</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">
          This link will expire in <strong>24 hours</strong>.<br/>
          If the button does not work, copy and paste this link in your browser:<br/>
          <a href="${verifyUrl}" style="color: #165DAD; word-break: break-all;">${verifyUrl}</a>
        </p>
      `
    );

    return this.dispatchEmail({
      eventKey: `verify_${toEmail}_${rawToken.slice(0, 16)}`,
      toEmail,
      recipientName,
      subject,
      textContent,
      htmlContent,
    });
  }

  async sendResendEmailVerification(toEmail: string, recipientName: string, rawToken: string): Promise<boolean> {
    return this.sendEmailVerification(toEmail, recipientName, rawToken);
  }

  // =========================================================================
  // 4. Forgot Password & Password Reset Link
  // =========================================================================
  async sendPasswordResetEmail(toEmail: string, recipientName: string, rawToken: string): Promise<boolean> {
    const appUrl = this.getAppUrl();
    const resetUrl = `${appUrl}/auth/reset-password?token=${encodeURIComponent(rawToken)}`;
    const subject = 'Reset Your ASKR EV Account Password';
    const textContent = `Hello ${recipientName || 'Member'},\n\nYou requested a password reset for your ASKR EV account.\n\nPlease reset your password using the following link:\n${resetUrl}\n\nThis link is valid for 15 minutes.\n\nBest regards,\nASKR EV Security Team`;
    const htmlContent = this.wrapTemplate(
      'Password Reset Request',
      `
        <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
        <p>We received a request to reset your ASKR EV account password.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #165DAD; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Reset Password</a>
        </div>
        <p style="font-size: 13px; color: #64748b;">
          This single-use link will expire in <strong>15 minutes</strong>.<br/>
          If you did not request this, please disregard this email. Your password will remain unchanged.
        </p>
      `
    );

    return this.dispatchEmail({
      eventKey: `pwd_reset_${toEmail}_${rawToken.slice(0, 16)}`,
      toEmail,
      recipientName,
      subject,
      textContent,
      htmlContent,
    });
  }

  // =========================================================================
  // 5. Password Reset / Changed Notification
  // =========================================================================
  async sendPasswordChangedNotification(toEmail: string, recipientName: string): Promise<boolean> {
    const subject = 'Security Notice: Your ASKR EV Password Was Changed';
    const textContent = `Hello ${recipientName || 'Member'},\n\nThis is a security confirmation that your ASKR EV account password was changed successfully.\n\nIf you did not make this change, please contact ASKR EV Support immediately.\n\nBest regards,\nASKR EV Security Team`;
    const htmlContent = this.wrapTemplate(
      'Security Alert: Password Changed',
      `
        <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
        <p>Your ASKR EV account password was recently updated successfully.</p>
        <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 14px; margin: 20px 0; color: #065f46; font-size: 13px;">
          ✓ Password update confirmed at ${new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }).format(new Date())} IST.
        </div>
        <p style="font-size: 13px; color: #64748b;">
          If you did not authorize this change, please contact our security team immediately at support@askrevdrive.com.
        </p>
      `
    );

    return this.dispatchEmail({
      eventKey: `pwd_changed_${toEmail}`,
      toEmail,
      recipientName,
      subject,
      textContent,
      htmlContent,
    });
  }

  // =========================================================================
  // 6. Membership Activation Confirmation
  // =========================================================================
  async sendMembershipActivationConfirmation(
    toEmail: string,
    recipientName: string,
    details: { packageName: string; invoiceRef?: string; directSponsorBonusINR?: number }
  ): Promise<boolean> {
    const subject = `ASKR EV Membership Activated — ${details.packageName}`;
    const textContent = `Hello ${recipientName || 'Member'},\n\nCongratulations! Your ASKR EV membership package has been activated: ${details.packageName}.\nInvoice Reference: ${details.invoiceRef || 'N/A'}\n\nBest regards,\nASKR EV Team`;
    const htmlContent = this.wrapTemplate(
      'Membership Activated Successfully',
      `
        <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
        <p>Congratulations! Your ASKR EV package activation is complete.</p>
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr><td style="color: #64748b; padding: 4px 0;">Activated Package:</td><td style="font-weight: 700; color: #166534;">${details.packageName}</td></tr>
            ${details.invoiceRef ? `<tr><td style="color: #64748b; padding: 4px 0;">Reference:</td><td style="font-family: monospace;">${details.invoiceRef}</td></tr>` : ''}
            <tr><td style="color: #64748b; padding: 4px 0;">Activation Date:</td><td>${new Date().toLocaleDateString('en-IN')}</td></tr>
          </table>
        </div>
      `
    );

    return this.dispatchEmail({
      eventKey: `act_${toEmail}_${details.packageName}_${details.invoiceRef || ''}`,
      toEmail,
      recipientName,
      subject,
      textContent,
      htmlContent,
    });
  }

  // =========================================================================
  // 7. Membership Upgrade Confirmation
  // =========================================================================
  async sendMembershipUpgradeConfirmation(
    toEmail: string,
    recipientName: string,
    details: { fromPackage: string; toPackage: string; invoiceRef?: string }
  ): Promise<boolean> {
    const subject = `ASKR EV Membership Upgraded to ${details.toPackage}`;
    const textContent = `Hello ${recipientName || 'Member'},\n\nYour membership upgrade to ${details.toPackage} is complete.\n\nBest regards,\nASKR EV Team`;
    const htmlContent = this.wrapTemplate(
      'Membership Upgrade Confirmed',
      `
        <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
        <p>Your membership package has been successfully upgraded from <strong>${details.fromPackage}</strong> to <strong>${details.toPackage}</strong>.</p>
        <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: #1e40af;"><strong>New Package Status:</strong> ${details.toPackage}</p>
          ${details.invoiceRef ? `<p style="margin: 4px 0 0 0; font-size: 12px; color: #64748b;">Transaction: ${details.invoiceRef}</p>` : ''}
        </div>
      `
    );

    return this.dispatchEmail({
      eventKey: `upg_${toEmail}_${details.toPackage}_${details.invoiceRef || ''}`,
      toEmail,
      recipientName,
      subject,
      textContent,
      htmlContent,
    });
  }

  // =========================================================================
  // 8. Shopping Voucher Issuance
  // =========================================================================
  async sendVoucherIssuanceEmail(
    toEmail: string,
    recipientName: string,
    voucherDetails: { voucherCode: string; category: string; valueINR: number; expiresAt: string }
  ): Promise<boolean> {
    const subject = `New ASKR EV Shopping Voucher Issued: ₹${voucherDetails.valueINR}`;
    const textContent = `Hello ${recipientName || 'Member'},\n\nA shopping voucher has been issued to your account.\nVoucher Code: ${voucherDetails.voucherCode}\nValue: ₹${voucherDetails.valueINR}\nCategory: ${voucherDetails.category}\nExpires: ${voucherDetails.expiresAt}\n\nBest regards,\nASKR EV Team`;
    const htmlContent = this.wrapTemplate(
      'Shopping Voucher Credited',
      `
        <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
        <p>A new shopping voucher has been credited to your ASKR EV account.</p>
        <div style="background: linear-gradient(135deg, #165DAD 0%, #0C2348 100%); color: #ffffff; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
          <div style="font-size: 12px; opacity: 0.8; text-transform: uppercase;">Shopping Voucher Code</div>
          <div style="font-size: 26px; font-weight: 800; letter-spacing: 2px; font-family: monospace; margin: 8px 0;">${voucherDetails.voucherCode}</div>
          <div style="font-size: 18px; font-weight: 700; color: #a5f3fc;">Value: ₹${voucherDetails.valueINR.toLocaleString('en-IN')}</div>
          <div style="font-size: 11px; opacity: 0.75; margin-top: 8px;">Category: ${voucherDetails.category} | Valid Until: ${voucherDetails.expiresAt}</div>
        </div>
      `
    );

    return this.dispatchEmail({
      eventKey: `voucher_${toEmail}_${voucherDetails.voucherCode}`,
      toEmail,
      recipientName,
      subject,
      textContent,
      htmlContent,
    });
  }

  /**
   * Alias for backward compatibility with packages service
   */
  async sendVoucherNotification(
    toEmail: string,
    recipientName: string,
    voucherDetails: any
  ): Promise<boolean> {
    return this.sendVoucherIssuanceEmail(toEmail, recipientName, {
      voucherCode: voucherDetails.voucherCode || voucherDetails.code || 'ASKR-VOUCHER',
      category: voucherDetails.category || 'Retail Shopping',
      valueINR: voucherDetails.valueINR ?? voucherDetails.amountINR ?? 1000,
      expiresAt: voucherDetails.expiresAt || new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString(),
    });
  }

  // =========================================================================
  // 9. Withdrawal Request Confirmation
  // =========================================================================
  async sendWithdrawalRequestConfirmation(
    toEmail: string,
    recipientName: string,
    details: { requestId: string; amountINR: number; destinationMasked: string; date: string }
  ): Promise<boolean> {
    const subject = `Withdrawal Request Received: ₹${details.amountINR}`;
    const textContent = `Hello ${recipientName || 'Member'},\n\nWe have received your withdrawal request for ₹${details.amountINR}.\nRequest ID: ${details.requestId}\nDestination: ${details.destinationMasked}\nDate: ${details.date}\n\nBest regards,\nASKR EV Finance Team`;
    const htmlContent = this.wrapTemplate(
      'Withdrawal Request Received',
      `
        <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
        <p>Your withdrawal request has been received and logged for review.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr><td style="color: #64748b; padding: 4px 0;">Request ID:</td><td style="font-family: monospace;">${details.requestId}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Requested Amount:</td><td style="font-weight: 700; color: #0f172a;">₹${details.amountINR.toLocaleString('en-IN')}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Destination:</td><td>${details.destinationMasked}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Submitted On:</td><td>${details.date}</td></tr>
          </table>
        </div>
      `
    );

    return this.dispatchEmail({
      eventKey: `wd_req_${details.requestId}`,
      toEmail,
      recipientName,
      subject,
      textContent,
      htmlContent,
    });
  }

  // =========================================================================
  // 10. Withdrawal Approval or Rejection
  // =========================================================================
  async sendWithdrawalStatusEmail(
    toEmail: string,
    recipientName: string,
    details: { requestId: string; status: 'APPROVED' | 'REJECTED'; amountINR: number; reason?: string }
  ): Promise<boolean> {
    const isApproved = details.status === 'APPROVED';
    const subject = `Withdrawal Request ${details.status}: ₹${details.amountINR}`;
    const textContent = `Hello ${recipientName || 'Member'},\n\nYour withdrawal request for ₹${details.amountINR} (ID: ${details.requestId}) has been ${details.status.toLowerCase()}.${details.reason ? ` Reason: ${details.reason}` : ''}\n\nBest regards,\nASKR EV Finance Team`;
    const htmlContent = this.wrapTemplate(
      `Withdrawal Request ${isApproved ? 'Approved' : 'Rejected'}`,
      `
        <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
        <p>Your withdrawal request has been <strong>${details.status.toLowerCase()}</strong> by finance administration.</p>
        <div style="background-color: ${isApproved ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${isApproved ? '#bbf7d0' : '#fecaca'}; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <p style="margin: 0; font-size: 14px; color: ${isApproved ? '#166534' : '#991b1b'};">
            <strong>Status:</strong> ${details.status} | <strong>Amount:</strong> ₹${details.amountINR.toLocaleString('en-IN')}
          </p>
          ${details.reason ? `<p style="margin: 6px 0 0 0; font-size: 12px; color: #64748b;">Remarks: ${details.reason}</p>` : ''}
        </div>
      `
    );

    return this.dispatchEmail({
      eventKey: `wd_status_${details.requestId}_${details.status}`,
      toEmail,
      recipientName,
      subject,
      textContent,
      htmlContent,
    });
  }

  // =========================================================================
  // 11. Bank Settlement Confirmation
  // =========================================================================
  async sendBankSettlementConfirmation(
    toEmail: string,
    recipientName: string,
    details: { requestId: string; amountINR: number; utrNumber: string; settlementDate: string; destinationMasked: string }
  ): Promise<boolean> {
    const subject = `Settlement Completed: ₹${details.amountINR} Dispatched`;
    const textContent = `Hello ${recipientName || 'Member'},\n\nYour bank payout for ₹${details.amountINR} has been completed.\nBank Reference / UTR: ${details.utrNumber}\nDate: ${details.settlementDate}\nDestination: ${details.destinationMasked}\n\nBest regards,\nASKR EV Finance Team`;
    const htmlContent = this.wrapTemplate(
      'Bank Payout Settlement Completed',
      `
        <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
        <p>We are pleased to inform you that your withdrawal settlement has been processed to your destination account.</p>
        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr><td style="color: #64748b; padding: 4px 0;">Settled Amount:</td><td style="font-weight: 700; color: #166534;">₹${details.amountINR.toLocaleString('en-IN')}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Bank Reference / UTR:</td><td style="font-family: monospace; font-weight: 700; color: #165DAD;">${details.utrNumber}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Destination:</td><td>${details.destinationMasked}</td></tr>
            <tr><td style="color: #64748b; padding: 4px 0;">Settlement Date:</td><td>${details.settlementDate}</td></tr>
          </table>
        </div>
      `
    );

    return this.dispatchEmail({
      eventKey: `settle_${details.requestId}_${details.utrNumber}`,
      toEmail,
      recipientName,
      subject,
      textContent,
      htmlContent,
    });
  }

  // =========================================================================
  // 12. Account Security Notifications
  // =========================================================================
  async sendSecurityAlertNotification(
    toEmail: string,
    recipientName: string,
    details: { alertType: string; message: string; timestamp: string; ipAddress?: string }
  ): Promise<boolean> {
    const subject = `ASKR EV Security Alert: ${details.alertType}`;
    const textContent = `Hello ${recipientName || 'Member'},\n\nSecurity Notice: ${details.message}\nTime: ${details.timestamp}${details.ipAddress ? `\nIP Address: ${details.ipAddress}` : ''}\n\nBest regards,\nASKR EV Security Team`;
    const htmlContent = this.wrapTemplate(
      `Security Alert: ${details.alertType}`,
      `
        <p>Hello <strong>${recipientName || 'Member'}</strong>,</p>
        <p>A notable security event was detected on your account:</p>
        <div style="background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #92400e;">
          <p style="margin: 0; font-weight: 600;">${details.message}</p>
          <p style="margin: 6px 0 0 0; color: #78350f; font-size: 11px;">Timestamp: ${details.timestamp}${details.ipAddress ? ` | Source IP: ${details.ipAddress}` : ''}</p>
        </div>
      `
    );

    return this.dispatchEmail({
      eventKey: `sec_${toEmail}_${details.alertType}_${Math.floor(Date.now() / 60000)}`,
      toEmail,
      recipientName,
      subject,
      textContent,
      htmlContent,
    });
  }
}

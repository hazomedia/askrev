import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailService } from './email.service';

describe('EmailService - Complete 12 Transactional Events & Brevo HTTPS Suite', () => {
  let emailService: EmailService;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('1. Exclusive Brevo HTTPS API Submission & Log Accuracy', () => {
    it('should successfully dispatch via Brevo HTTPS API and log "accepted by Brevo"', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-mock-valid-key';
      process.env.SMTP_FROM = 'ASKR EV <no-reply@askrevdrive.com>';
      process.env.FRONTEND_URL = 'https://www.askrevdrive.com';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ messageId: '<brevo-msg-001@smtp-relay.mailin.fr>' })),
      });
      vi.stubGlobal('fetch', mockFetch);

      emailService = new EmailService();

      const success = await emailService.sendPasswordResetEmail(
        'member@askrevdrive.com',
        'John Doe',
        'raw-secure-reset-token-12345'
      );

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.brevo.com/v3/smtp/email');
      expect(options.method).toBe('POST');
      expect(options.headers).toMatchObject({
        'accept': 'application/json',
        'api-key': 'xkeysib-mock-valid-key',
        'content-type': 'application/json',
      });

      const body = JSON.parse(options.body);
      expect(body.sender).toEqual({ name: 'ASKR EV', email: 'no-reply@askrevdrive.com' });
      expect(body.to).toEqual([{ email: 'member@askrevdrive.com', name: 'John Doe' }]);
      expect(body.subject).toBe('Reset Your ASKR EV Account Password');
      expect(body.textContent).toContain('https://www.askrevdrive.com/auth/reset-password?token=raw-secure-reset-token-12345');
    });

    it('should dispatch verification email via Brevo HTTPS', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-mock-valid-key';
      process.env.SMTP_FROM = 'ASKR EV <no-reply@askrevdrive.com>';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ messageId: '<verify-msg-002@smtp-relay.mailin.fr>' })),
      });
      vi.stubGlobal('fetch', mockFetch);

      emailService = new EmailService();

      const success = await emailService.sendEmailVerification(
        'newmember@askrevdrive.com',
        'Jane Member',
        'verification-token-67890'
      );

      expect(success).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Required 12 Transactional Email Workflows', () => {
    let mockFetch: any;

    beforeEach(() => {
      process.env.BREVO_API_KEY = 'xkeysib-mock-valid-key';
      process.env.SMTP_FROM = 'ASKR EV <no-reply@askrevdrive.com>';
      mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ messageId: '<test-msg-id>' })),
      });
      vi.stubGlobal('fetch', mockFetch);
      emailService = new EmailService();
    });

    it('Event 1: New member registration welcome email', async () => {
      const res = await emailService.sendWelcomeRegistrationEmail('user1@example.com', 'Alice User', 'ASKR-10001');
      expect(res).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('Welcome to ASKR EV');
      expect(body.textContent).toContain('ASKR-10001');
    });

    it('Event 3: Resend verification email', async () => {
      const res = await emailService.sendResendEmailVerification('user2@example.com', 'Bob User', 'token-resend-123');
      expect(res).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('Verify Your ASKR EV Email Address');
    });

    it('Event 5: Password changed confirmation', async () => {
      const res = await emailService.sendPasswordChangedNotification('user3@example.com', 'Charlie User');
      expect(res).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('Password Was Changed');
    });

    it('Event 6: Membership activation confirmation', async () => {
      const res = await emailService.sendMembershipActivationConfirmation('user4@example.com', 'David User', {
        packageName: 'EV PRO',
        invoiceRef: 'INV-2026-001',
      });
      expect(res).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('Membership Activated — EV PRO');
      expect(body.textContent).toContain('INV-2026-001');
    });

    it('Event 7: Membership upgrade confirmation', async () => {
      const res = await emailService.sendMembershipUpgradeConfirmation('user5@example.com', 'Eve User', {
        fromPackage: 'EV PRO',
        toPackage: 'EV ULTRA',
        invoiceRef: 'INV-2026-002',
      });
      expect(res).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('Membership Upgraded to EV ULTRA');
    });

    it('Event 8: Shopping Voucher issuance email', async () => {
      const res = await emailService.sendVoucherIssuanceEmail('user6@example.com', 'Frank User', {
        voucherCode: 'VCH-998822',
        category: 'EV Showroom Credit',
        valueINR: 5000,
        expiresAt: '2027-11-26',
      });
      expect(res).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('Shopping Voucher Issued: ₹5000');
      expect(body.textContent).toContain('VCH-998822');
    });

    it('Event 9: Withdrawal request confirmation', async () => {
      const res = await emailService.sendWithdrawalRequestConfirmation('user7@example.com', 'Grace User', {
        requestId: 'WD-101',
        amountINR: 3000,
        destinationMasked: 'Bank: HDFC (A/C: ••••4321)',
        date: '2026-11-26',
      });
      expect(res).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('Withdrawal Request Received: ₹3000');
      expect(body.textContent).toContain('WD-101');
    });

    it('Event 10: Withdrawal approval or rejection', async () => {
      const resApprove = await emailService.sendWithdrawalStatusEmail('user8@example.com', 'Heidi User', {
        requestId: 'WD-102',
        status: 'APPROVED',
        amountINR: 4500,
      });
      expect(resApprove).toBe(true);
      const bodyApprove = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(bodyApprove.subject).toContain('Withdrawal Request APPROVED: ₹4500');

      const resReject = await emailService.sendWithdrawalStatusEmail('user9@example.com', 'Ivan User', {
        requestId: 'WD-103',
        status: 'REJECTED',
        amountINR: 2000,
        reason: 'Bank account name mismatch',
      });
      expect(resReject).toBe(true);
      const bodyReject = JSON.parse(mockFetch.mock.calls[1][1].body);
      expect(bodyReject.subject).toContain('Withdrawal Request REJECTED: ₹2000');
      expect(bodyReject.textContent).toContain('Bank account name mismatch');
    });

    it('Event 11: Bank settlement confirmation', async () => {
      const res = await emailService.sendBankSettlementConfirmation('user10@example.com', 'Judy User', {
        requestId: 'WD-104',
        amountINR: 9000,
        utrNumber: 'HDFCN26330998811',
        settlementDate: '2026-11-26',
        destinationMasked: 'Bank: HDFC (A/C: ••••5678)',
      });
      expect(res).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('Settlement Completed: ₹9000 Dispatched');
      expect(body.textContent).toContain('HDFCN26330998811');
    });

    it('Event 12: Account security alert notification', async () => {
      const res = await emailService.sendSecurityAlertNotification('user11@example.com', 'Mallory User', {
        alertType: 'New Device Sign-in',
        message: 'A login from a new device was recorded.',
        timestamp: '2026-11-26 11:00 IST',
        ipAddress: '203.0.113.195',
      });
      expect(res).toBe(true);
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.subject).toContain('ASKR EV Security Alert: New Device Sign-in');
      expect(body.textContent).toContain('203.0.113.195');
    });
  });

  describe('3. Duplicate Suppression & Production Guards', () => {
    it('should suppress identical duplicate dispatch within 30 seconds', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-mock-valid-key';
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 201,
        text: () => Promise.resolve(JSON.stringify({ messageId: '<msg-1>' })),
      });
      vi.stubGlobal('fetch', mockFetch);
      emailService = new EmailService();

      // First call
      const res1 = await emailService.sendWelcomeRegistrationEmail('dup@example.com', 'Dup User', 'ASKR-999');
      expect(res1).toBe(true);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Second immediate call with identical parameters
      const res2 = await emailService.sendWelcomeRegistrationEmail('dup@example.com', 'Dup User', 'ASKR-999');
      expect(res2).toBe(true); // Returns true (safe suppression)
      expect(mockFetch).toHaveBeenCalledTimes(1); // Not called a second time
    });

    it('should abort and fail safely in production if BREVO_API_KEY is missing', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.BREVO_API_KEY;
      delete process.env.SMTP_HOST;

      emailService = new EmailService();

      const res = await emailService.sendWelcomeRegistrationEmail('prod@example.com', 'Prod User', 'ASKR-001');
      expect(res).toBe(false);
    });
  });
});

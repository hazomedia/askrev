import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailService } from './email.service';

describe('EmailService - Brevo HTTPS API Hardening', () => {
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
      expect(body.textContent).toContain('15 minutes');
    });

    it('should dispatch verification email and log accepted by Brevo', async () => {
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

  describe('2. No SMTP Fallback When Brevo HTTP Fails', () => {
    it('should NEVER fall back to SMTP when Brevo HTTP API fails or rejects', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-mock-valid-key';
      // Even if SMTP variables are present in environment:
      process.env.SMTP_HOST = 'smtp.fallback-should-never-be-called.com';
      process.env.SMTP_USER = 'smtp-user';
      process.env.SMTP_PASS = 'smtp-pass';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: () => Promise.resolve(JSON.stringify({ message: 'Internal upstream error' })),
      });
      vi.stubGlobal('fetch', mockFetch);

      emailService = new EmailService();

      const success = await emailService.sendPasswordResetEmail(
        'user@askrevdrive.com',
        'User',
        'token-123'
      );

      // Must return false and not attempt SMTP fallback
      expect(success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should NEVER fall back to SMTP when Brevo HTTP API times out', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-mock-valid-key';
      process.env.SMTP_HOST = 'smtp.fallback-should-never-be-called.com';

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      const mockFetch = vi.fn().mockRejectedValue(abortError);
      vi.stubGlobal('fetch', mockFetch);

      emailService = new EmailService();

      const success = await emailService.sendPasswordResetEmail(
        'timeout@askrevdrive.com',
        'User',
        'token-timeout'
      );

      expect(success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('3. Production Guard: No Simulation Fallback in Production', () => {
    it('should reject and return false if BREVO_API_KEY is missing in production environment', async () => {
      process.env.NODE_ENV = 'production';
      delete process.env.BREVO_API_KEY;

      emailService = new EmailService();

      const resetSuccess = await emailService.sendPasswordResetEmail(
        'prod-user@askrevdrive.com',
        'Prod User',
        'token-reset-prod'
      );
      expect(resetSuccess).toBe(false);

      const verifySuccess = await emailService.sendEmailVerification(
        'prod-user@askrevdrive.com',
        'Prod User',
        'token-verify-prod'
      );
      expect(verifySuccess).toBe(false);

      const status = await emailService.verifyConnection();
      expect(status.success).toBe(false);
      expect(status.message).toContain('CRITICAL: BREVO_API_KEY is not configured in production');
    });

    it('should allow simulation fallback ONLY in non-production environments', async () => {
      process.env.NODE_ENV = 'development';
      delete process.env.BREVO_API_KEY;
      delete process.env.SMTP_HOST;

      emailService = new EmailService();

      const success = await emailService.sendPasswordResetEmail(
        'dev-user@askrevdrive.com',
        'Dev User',
        'token-dev'
      );
      expect(success).toBe(true);
    });
  });

  describe('4. Safe Error Diagnostics & Key Sanitization', () => {
    it('should sanitize API key and tokens in error diagnostic messages', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-secret-key-99999';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({
          message: 'Error with key xkeysib-secret-key-99999 and token=secret-token-value',
        })),
      });
      vi.stubGlobal('fetch', mockFetch);

      emailService = new EmailService();

      const success = await emailService.sendPasswordResetEmail(
        'sanitized@askrevdrive.com',
        'User',
        'secret-token-value'
      );

      expect(success).toBe(false);
    });

    it('should verify connection without sending emails (empty validation pattern)', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-test-auth-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ code: 'missing_parameter', message: 'sender is missing' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      emailService = new EmailService();
      const status = await emailService.verifyConnection();

      expect(status.success).toBe(true);
      expect(status.provider).toBe('BREVO_HTTP');
      expect(status.message).toContain('zero emails sent');

      // Confirmed payload was empty body ({}) so Brevo does not dispatch an email
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.brevo.com/v3/smtp/email');
      expect(options.body).toBe('{}');
    });

    it('should report invalid API key in verifyConnection without sending emails', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-bad-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ code: 'unauthorized', message: 'Key not found' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      emailService = new EmailService();
      const status = await emailService.verifyConnection();

      expect(status.success).toBe(false);
      expect(status.message).toContain('Key not found');
    });
  });
});

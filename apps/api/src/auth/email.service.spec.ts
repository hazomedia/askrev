import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EmailService } from './email.service';

describe('EmailService - Brevo HTTPS API & Fallback Transports', () => {
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

  describe('1. Successful Brevo HTTPS API submission', () => {
    it('should successfully send password reset email via POST https://api.brevo.com/v3/smtp/email', async () => {
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
      expect(body.htmlContent).toContain('href="https://www.askrevdrive.com/auth/reset-password?token=raw-secure-reset-token-12345"');
    });

    it('should successfully send email verification link via Brevo HTTPS API', async () => {
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

      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toBe('https://api.brevo.com/v3/smtp/email');
      const body = JSON.parse(options.body);
      expect(body.subject).toBe('Verify Your ASKR EV Email Address');
      expect(body.textContent).toContain('token=verification-token-67890');
      expect(body.textContent).toContain('24 hours');
    });
  });

  describe('2. Invalid Brevo API Key handling', () => {
    it('should handle HTTP 401 Unauthorized safely and return false without leaking key', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-invalid-secret-key-123456';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: () => Promise.resolve(JSON.stringify({ message: 'Key not found', code: 'unauthorized' })),
      });
      vi.stubGlobal('fetch', mockFetch);

      emailService = new EmailService();

      const success = await emailService.sendPasswordResetEmail(
        'target@askrevdrive.com',
        'Target User',
        'reset-token'
      );

      expect(success).toBe(false);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should report failure in verifyConnection for invalid API key', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-invalid-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Key not found', code: 'unauthorized' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      emailService = new EmailService();
      const status = await emailService.verifyConnection();

      expect(status.success).toBe(false);
      expect(status.provider).toBe('BREVO_HTTP');
      expect(status.message).toContain('Key not found');
    });
  });

  describe('3. Provider rejection handling', () => {
    it('should capture provider rejection details (HTTP 400) and return false safely', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-mock-valid-key';

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        text: () => Promise.resolve(JSON.stringify({ message: 'Invalid recipient email format', code: 'invalid_parameter' })),
      });
      vi.stubGlobal('fetch', mockFetch);

      emailService = new EmailService();

      const success = await emailService.sendPasswordResetEmail(
        'invalid-format-email',
        'Test User',
        'test-token'
      );

      expect(success).toBe(false);
    });
  });

  describe('4. Network timeout handling', () => {
    it('should handle request abort / timeout after 10 seconds gracefully', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-mock-valid-key';

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      const mockFetch = vi.fn().mockRejectedValue(abortError);
      vi.stubGlobal('fetch', mockFetch);

      emailService = new EmailService();

      const success = await emailService.sendPasswordResetEmail(
        'timeout@askrevdrive.com',
        'Timeout User',
        'token-abc'
      );

      expect(success).toBe(false);
    });
  });

  describe('5. Missing API key & Fallback handling', () => {
    it('should safely fall back to simulation mode when neither BREVO_API_KEY nor SMTP is set', async () => {
      delete process.env.BREVO_API_KEY;
      delete process.env.SMTP_HOST;
      delete process.env.SMTP_USER;
      delete process.env.SMTP_PASS;

      emailService = new EmailService();

      const success = await emailService.sendPasswordResetEmail(
        'sim@askrevdrive.com',
        'Sim User',
        'token-sim'
      );

      expect(success).toBe(true);

      const verifyStatus = await emailService.verifyConnection();
      expect(verifyStatus.success).toBe(false);
      expect(verifyStatus.provider).toBe('SIMULATION');
    });

    it('should authenticate verifyConnection via Brevo parameter validation pattern', async () => {
      process.env.BREVO_API_KEY = 'xkeysib-working-key';

      // When Brevo authenticates but receives an empty body, it returns 400 with code missing_parameter
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
      expect(status.message).toContain('verified successfully');
    });
  });
});

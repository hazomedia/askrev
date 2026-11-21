import { Controller, Post, Body, Get, Patch, Param, UseGuards, Req, Res, HttpCode, HttpStatus } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  VerifyMfaDto,
  MfaEnrollmentSetupDto,
  MfaEnrollmentConfirmDto,
  DisableMfaDto,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  VerifyEmailDto,
  UpdateProfileDto,
  ServiceTokenRequestDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CsrfGuard } from './guards/csrf.guard';
import { CurrentUser } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  private getCookieOptions(req: Request) {
    const isProduction = process.env.NODE_ENV === 'production';
    const hostname = (req?.hostname || (req?.headers?.host ? String(req.headers.host) : '')).toLowerCase();
    const isAskrDomain = hostname.includes('askrevdrive.com');

    const options: any = {
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
    };

    if (process.env.COOKIE_DOMAIN) {
      options.domain = process.env.COOKIE_DOMAIN;
    } else if (isAskrDomain && isProduction) {
      options.domain = '.askrevdrive.com';
    }

    return options;
  }

  @Get('csrf')
  getCsrfToken(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const existing = req.cookies?.['askrev_csrf_token'];
    const csrfToken = existing || crypto.randomBytes(32).toString('hex');
    const cookieOpts = this.getCookieOptions(req);

    res.cookie('askrev_csrf_token', csrfToken, {
      ...cookieOpts,
      httpOnly: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { csrfToken };
  }

  @Get('sponsor-lookup/:memberId')
  async lookupSponsor(@Param('memberId') memberId: string) {
    return this.authService.lookupSponsor(memberId);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.resetPassword(dto);
    const cookieOpts = this.getCookieOptions(req);
    // Clear cookies to enforce fresh login with the new password
    res.clearCookie('askrev_access_token', { ...cookieOpts, path: '/' });
    res.clearCookie('askrev_refresh_token', { ...cookieOpts, path: '/api/auth' });
    res.clearCookie('askrev_csrf_token', { ...cookieOpts, path: '/' });
    return result;
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('register')
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.register(dto);
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const cookieOpts = this.getCookieOptions(req);

    res.cookie('askrev_access_token', result.tokens.accessToken, {
      ...cookieOpts,
      httpOnly: true,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('askrev_refresh_token', result.tokens.refreshToken, {
      ...cookieOpts,
      httpOnly: true,
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('askrev_csrf_token', csrfToken, {
      ...cookieOpts,
      httpOnly: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: result.message,
      emailVerificationSent: result.emailVerificationSent,
      csrfToken,
      user: result.user,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(dto);

    if (result.mfaEnrollmentRequired) {
      return {
        mfaEnrollmentRequired: true,
        message: result.message,
        enrollmentToken: result.enrollmentToken,
        user: result.user,
      };
    }

    // Set secure HttpOnly cookies for browser sessions
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const cookieOpts = this.getCookieOptions(req);

    res.cookie('askrev_access_token', result.tokens.accessToken, {
      ...cookieOpts,
      httpOnly: true,
      path: '/',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('askrev_refresh_token', result.tokens.refreshToken, {
      ...cookieOpts,
      httpOnly: true,
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Double-submit CSRF token (readable by JavaScript to attach as X-CSRF-Token)
    res.cookie('askrev_csrf_token', csrfToken, {
      ...cookieOpts,
      httpOnly: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: result.message,
      csrfToken,
      user: result.user,
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const refreshToken = dto?.refreshToken || req.cookies?.['askrev_refresh_token'];
    const result = await this.authService.refresh(refreshToken);

    const csrfToken = crypto.randomBytes(32).toString('hex');
    const cookieOpts = this.getCookieOptions(req);

    res.cookie('askrev_access_token', result.tokens.accessToken, {
      ...cookieOpts,
      httpOnly: true,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('askrev_refresh_token', result.tokens.refreshToken, {
      ...cookieOpts,
      httpOnly: true,
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('askrev_csrf_token', csrfToken, {
      ...cookieOpts,
      httpOnly: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: result.message,
      csrfToken,
      user: result.user,
    };
  }

  @Post('mfa/enrollment-setup')
  @HttpCode(HttpStatus.OK)
  async setupMfaEnrollment(@Body() dto: MfaEnrollmentSetupDto) {
    return this.authService.setupMfaEnrollment(dto);
  }

  @Post('mfa/enrollment-confirm')
  @HttpCode(HttpStatus.OK)
  async confirmMfaEnrollment(
    @Body() dto: MfaEnrollmentConfirmDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.confirmMfaEnrollment(dto);

    // Upon successful enrollment confirmation, initialize the authenticated session
    const csrfToken = crypto.randomBytes(32).toString('hex');
    const cookieOpts = this.getCookieOptions(req);

    res.cookie('askrev_access_token', result.tokens.accessToken, {
      ...cookieOpts,
      httpOnly: true,
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('askrev_refresh_token', result.tokens.refreshToken, {
      ...cookieOpts,
      httpOnly: true,
      path: '/api/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie('askrev_csrf_token', csrfToken, {
      ...cookieOpts,
      httpOnly: false,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return {
      message: result.message,
      success: true,
      recoveryCodes: result.recoveryCodes,
      csrfToken,
      user: result.user,
    };
  }

  /**
   * Dedicated machine-to-machine service token endpoint.
   * Requires strict client secret authentication.
   */
  @Post('service/token')
  @HttpCode(HttpStatus.OK)
  async issueServiceToken(@Body() dto: ServiceTokenRequestDto) {
    return this.authService.issueServiceToken(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const authHeader: string = req.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : req.cookies?.['askrev_access_token'] || undefined;

    const cookieOpts = this.getCookieOptions(req);
    // Clear all session cookies
    res.clearCookie('askrev_access_token', { ...cookieOpts, path: '/' });
    res.clearCookie('askrev_refresh_token', { ...cookieOpts, path: '/api/auth' });
    res.clearCookie('askrev_csrf_token', { ...cookieOpts, path: '/' });

    return this.authService.logout(user.id, token);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@CurrentUser() user: any) {
    return this.authService.getProfile(user.id);
  }

  @UseGuards(JwtAuthGuard, CsrfGuard)
  @Patch('profile')
  async updateProfile(
    @CurrentUser() user: any,
    @Body() dto: UpdateProfileDto
  ) {
    return this.authService.updateProfile(user.id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-verification')
  async sendVerification(@CurrentUser() user: any) {
    return this.authService.sendEmailVerification(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/setup')
  async setupMfa(@CurrentUser() user: any) {
    return this.authService.setupMfa(user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/enable')
  async enableMfa(@CurrentUser() user: any, @Body() dto: VerifyMfaDto) {
    return this.authService.enableMfa(user.id, dto.code, dto.secret);
  }

  @UseGuards(JwtAuthGuard)
  @Post('mfa/disable')
  async disableMfa(@CurrentUser() user: any, @Body() dto: DisableMfaDto) {
    return this.authService.disableMfa(user.id, dto);
  }

  @UseGuards(JwtAuthGuard, CsrfGuard)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: any,
    @Body() dto: ChangePasswordDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const authHeader: string = req.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : req.cookies?.['askrev_access_token'] || undefined;

    const result = await this.authService.changePassword(user.id, dto, token);

    const cookieOpts = this.getCookieOptions(req);
    // Clear session cookies to enforce re-authentication
    res.clearCookie('askrev_access_token', { ...cookieOpts, path: '/' });
    res.clearCookie('askrev_refresh_token', { ...cookieOpts, path: '/api/auth' });
    res.clearCookie('askrev_csrf_token', { ...cookieOpts, path: '/' });

    return result;
  }

  @UseGuards(JwtAuthGuard, CsrfGuard)
  @Post('revoke-all-sessions')
  async revokeAllSessions(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const authHeader: string = req.headers?.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : req.cookies?.['askrev_access_token'] || undefined;

    const result = await this.authService.revokeAllSessions(user.id, token);

    const cookieOpts = this.getCookieOptions(req);
    res.clearCookie('askrev_access_token', { ...cookieOpts, path: '/' });
    res.clearCookie('askrev_refresh_token', { ...cookieOpts, path: '/api/auth' });
    res.clearCookie('askrev_csrf_token', { ...cookieOpts, path: '/' });

    return result;
  }
}

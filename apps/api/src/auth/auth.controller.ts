import { Controller, Post, Body, Get, UseGuards, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import * as crypto from 'crypto';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, VerifyMfaDto, DisableMfaDto, ChangePasswordDto } from './dto/auth.dto';
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
      sameSite: isAskrDomain ? 'lax' : (isProduction ? 'none' : 'lax'),
    };

    if (isAskrDomain && isProduction) {
      options.domain = '.askrevdrive.com';
    }

    return options;
  }

  @Post('register')
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response
  ) {
    const result = await this.authService.login(dto);

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
      tokens: result.tokens, // Provided for backward compatibility with CLI/QA scripts
    };
  }

  @Post('refresh')
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
      tokens: result.tokens,
    };
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

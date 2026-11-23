import {
  Controller,
  Get,
  Post,
  Param,
  Req,
  Res,
  UseGuards,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { BannersService } from './banners.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { getJwtAccessSecret, isAccessTokenRevoked } from '../auth/jwt-secrets';

@Controller('banners')
export class BannersController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly jwtService: JwtService,
  ) {}

  private async extractUserIdFromRequest(req: Request): Promise<string | undefined> {
    try {
      let token = '';
      const authHeader = req.headers?.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (req.cookies) {
        token =
          req.cookies['askrev_access_token'] ||
          req.cookies['askrev_session'] ||
          req.cookies['askrev_admin_session'] ||
          '';
      }

      if (!token || isAccessTokenRevoked(token)) {
        return undefined;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: getJwtAccessSecret(),
      });

      return payload?.sub || payload?.id;
    } catch {
      return undefined;
    }
  }

  /**
   * GET /api/banners/active
   * Fetch active top banner and member-eligible welcome popup
   */
  @Get('active')
  async getActiveBanners(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    const userId = await this.extractUserIdFromRequest(req);
    return this.bannersService.getActiveBanners(userId);
  }

  /**
   * POST /api/banners/popup/:id/dismiss
   * Record that member has dismissed this popup campaign
   */
  @Post('popup/:id/dismiss')
  @UseGuards(JwtAuthGuard)
  async dismissPopup(@Param('id') campaignId: string, @CurrentUser() user: any) {
    const userId = user?.id || user?.sub;
    if (!userId) {
      throw new UnauthorizedException('Authentication required to record dismissal');
    }
    return this.bannersService.recordDismissal(campaignId, userId);
  }
}

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { HeroSliderService } from './hero-slider.service';
import { StorageService } from '../products/storage.service';
import { CreateHeroSlideDto } from './dto/create-hero-slide.dto';
import { UpdateHeroSlideDto } from './dto/update-hero-slide.dto';
import { ReorderHeroSlidesDto } from './dto/reorder-hero-slides.dto';
import { PublicHeroSliderQueryDto, AdminHeroSliderQueryDto } from './dto/hero-slide-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@askrev/shared';
import { getJwtAccessSecret, isAccessTokenRevoked } from '../auth/jwt-secrets';

// =============================================================================
// 1. PUBLIC HERO SLIDER CONTROLLER (/api/homepage/hero-slides)
// =============================================================================
@Controller(['homepage/hero-slides', 'public/homepage/hero-slides'])
export class HeroSliderPublicController {
  constructor(
    private readonly heroSliderService: HeroSliderService,
    private readonly jwtService: JwtService,
  ) {}

  private async verifyAdminCaller(req: Request): Promise<boolean> {
    try {
      let token = '';
      const authHeader = req.headers?.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (req.cookies) {
        token = req.cookies['askrev_access_token'] || req.cookies['askrev_admin_session'] || '';
      }

      if (!token || isAccessTokenRevoked(token)) {
        return false;
      }

      const payload = await this.jwtService.verifyAsync(token, {
        secret: getJwtAccessSecret(),
      });

      if (!payload || !payload.sub) {
        return false;
      }

      const role = (payload.role || '').toUpperCase();
      return (
        role === UserRole.SUPER_ADMIN ||
        role === UserRole.ADMIN_OPERATIONS ||
        role === 'ADMIN'
      );
    } catch {
      return false;
    }
  }

  private setNoCacheHeaders(res: Response) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }

  @Get()
  async getActiveSlides(
    @Query() query: PublicHeroSliderQueryDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoCacheHeaders(res);
    const wantsPreview = query?.preview === true || req.query?.preview === 'true';
    const isAdmin = wantsPreview ? await this.verifyAdminCaller(req) : false;
    return this.heroSliderService.getPublicSlides(isAdmin);
  }
}

// =============================================================================
// 2. ADMIN HERO SLIDER MANAGEMENT CONTROLLER (/api/admin/homepage/hero-slides)
// =============================================================================
@Controller('admin/homepage/hero-slides')
@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_OPERATIONS)
export class HeroSliderAdminController {
  constructor(
    private readonly heroSliderService: HeroSliderService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  async getAllSlides(@Query() query: AdminHeroSliderQueryDto) {
    return this.heroSliderService.getAdminSlides(query);
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadHeroImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('kind') kind?: 'desktop' | 'mobile',
    @Query('name') name?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No image file was uploaded');
    }
    const targetKind = kind === 'mobile' ? 'mobile' : 'desktop';
    return this.storageService.uploadHeroImage(file, targetKind, name || 'hero');
  }

  @Post('reorder')
  async reorderSlides(@Body() dto: ReorderHeroSlidesDto) {
    return this.heroSliderService.reorderSlides(dto.slideIds);
  }

  @Get(':id')
  async getSlideById(@Param('id') id: string) {
    return this.heroSliderService.getSlideById(id);
  }

  @Post()
  async createSlide(@Body() dto: CreateHeroSlideDto, @CurrentUser() user: any) {
    return this.heroSliderService.createSlide(dto, user?.id || user?.sub);
  }

  @Patch(':id')
  async updateSlide(
    @Param('id') id: string,
    @Body() dto: UpdateHeroSlideDto,
    @CurrentUser() user: any,
  ) {
    return this.heroSliderService.updateSlide(id, dto, user?.id || user?.sub);
  }

  @Post(':id/publish')
  async publishSlide(@Param('id') id: string, @CurrentUser() user: any) {
    return this.heroSliderService.publishSlide(id, user?.id || user?.sub);
  }

  @Post(':id/unpublish')
  async unpublishSlide(@Param('id') id: string, @CurrentUser() user: any) {
    return this.heroSliderService.unpublishSlide(id, user?.id || user?.sub);
  }

  @Post(':id/duplicate')
  async duplicateSlide(@Param('id') id: string, @CurrentUser() user: any) {
    return this.heroSliderService.duplicateSlide(id, user?.id || user?.sub);
  }

  @Delete(':id')
  async deleteSlide(@Param('id') id: string) {
    return this.heroSliderService.deleteSlide(id);
  }
}

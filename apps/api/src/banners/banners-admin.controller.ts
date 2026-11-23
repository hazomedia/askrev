import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { BannersService } from './banners.service';
import { StorageService } from '../products/storage.service';
import { UpdateTopBannerDto } from './dto/update-top-banner.dto';
import { CreateSlideDto } from './dto/create-slide.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';
import { ReorderSlidesDto } from './dto/reorder-slides.dto';
import { CreatePopupCampaignDto } from './dto/create-popup-campaign.dto';
import { UpdatePopupCampaignDto } from './dto/update-popup-campaign.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@askrev/shared';

@Controller('admin/banners')
@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
@Roles(UserRole.SUPER_ADMIN)
export class BannersAdminController {
  constructor(
    private readonly bannersService: BannersService,
    private readonly storageService: StorageService,
  ) {}

  // ---------------------------------------------------------------------------
  // Top Banner & Carousel Slides Management (Super Admin only)
  // ---------------------------------------------------------------------------
  @Get('top')
  async getTopBanner() {
    return this.bannersService.getAdminTopBanner();
  }

  @Put('top')
  async updateTopBanner(@Body() dto: UpdateTopBannerDto) {
    return this.bannersService.updateTopBanner(dto);
  }

  @Get('slides')
  async getSlides() {
    return this.bannersService.getAdminSlides();
  }

  @Get('slides/:id')
  async getSlideById(@Param('id') id: string) {
    return this.bannersService.getAdminSlideById(id);
  }

  @Post('slides')
  async createSlide(@Body() dto: CreateSlideDto) {
    return this.bannersService.createSlide(dto);
  }

  @Patch('slides/:id')
  async updateSlide(@Param('id') id: string, @Body() dto: UpdateSlideDto) {
    return this.bannersService.updateSlide(id, dto);
  }

  @Delete('slides/:id')
  async deleteSlide(@Param('id') id: string) {
    return this.bannersService.deleteSlide(id);
  }

  @Post('slides/:id/publish')
  async publishSlide(@Param('id') id: string) {
    return this.bannersService.publishSlide(id);
  }

  @Post('slides/:id/disable')
  async disableSlide(@Param('id') id: string) {
    return this.bannersService.disableSlide(id);
  }

  @Post('slides/reorder')
  async reorderSlides(@Body() dto: ReorderSlidesDto) {
    return this.bannersService.reorderSlides(dto.slideIds);
  }

  // ---------------------------------------------------------------------------
  // Image Upload for Banners
  // ---------------------------------------------------------------------------
  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadBannerImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('kind') kind?: 'top' | 'popup',
  ) {
    if (!file) {
      throw new BadRequestException('No image file was uploaded');
    }
    const targetKind = kind === 'popup' ? 'popup' : 'top';
    return this.storageService.uploadBannerImage(file, targetKind);
  }

  // ---------------------------------------------------------------------------
  // Welcome Popup Campaigns Management
  // ---------------------------------------------------------------------------
  @Get('popups')
  async getPopupCampaigns() {
    return this.bannersService.getAdminPopupCampaigns();
  }

  @Get('popups/:id')
  async getPopupCampaignById(@Param('id') id: string) {
    return this.bannersService.getAdminPopupCampaignById(id);
  }

  @Post('popups')
  async createPopupCampaign(
    @Body() dto: CreatePopupCampaignDto,
    @CurrentUser() user: any,
  ) {
    return this.bannersService.createPopupCampaign(dto, user?.id || user?.sub);
  }

  @Patch('popups/:id')
  async updatePopupCampaign(
    @Param('id') id: string,
    @Body() dto: UpdatePopupCampaignDto,
    @CurrentUser() user: any,
  ) {
    return this.bannersService.updatePopupCampaign(id, dto, user?.id || user?.sub);
  }

  @Post('popups/:id/publish')
  async publishPopupCampaign(@Param('id') id: string) {
    return this.bannersService.publishPopupCampaign(id);
  }

  @Post('popups/:id/disable')
  async disablePopupCampaign(@Param('id') id: string) {
    return this.bannersService.disablePopupCampaign(id);
  }

  @Delete('popups/:id')
  async deletePopupCampaign(@Param('id') id: string) {
    return this.bannersService.deletePopupCampaign(id);
  }
}

import {
  Injectable,
  OnModuleInit,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTopBannerDto } from './dto/update-top-banner.dto';
import { CreateSlideDto } from './dto/create-slide.dto';
import { UpdateSlideDto } from './dto/update-slide.dto';
import { CreatePopupCampaignDto } from './dto/create-popup-campaign.dto';
import { UpdatePopupCampaignDto } from './dto/update-popup-campaign.dto';
import { BannerStatus, PopupFrequency } from '@prisma/client';

export interface CampaignWithComputedStatus {
  id: string;
  name: string;
  heading: string;
  subheading: string | null;
  message: string;
  buttonText: string;
  buttonLink: string;
  footerText: string | null;
  imageUrl: string | null;
  frequency: PopupFrequency;
  status: BannerStatus;
  computedStatus: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  startDate: Date | null;
  endDate: Date | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
  dismissalCount?: number;
}

export interface SlideWithComputedStatus {
  id: string;
  title: string | null;
  subtitle: string | null;
  badgeText: string | null;
  buttonText: string | null;
  desktopImageUrl: string;
  mobileImageUrl: string | null;
  linkUrl: string | null;
  altText: string | null;
  displayOrder: number;
  status: BannerStatus;
  isEnabled: boolean;
  computedStatus: 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'DISABLED';
  startDate: Date | null;
  endDate: Date | null;
  autoplayInterval: number;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BannersService implements OnModuleInit {
  private readonly logger = new Logger(BannersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaults();
  }

  /**
   * Idempotent initialization of default Top Banner and Welcome Popup Campaign
   */
  async seedDefaults() {
    try {
      // 1. Ensure default Top Banner exists
      const topCount = await this.prisma.dashboardTopBanner.count();
      if (topCount === 0) {
        await this.prisma.dashboardTopBanner.create({
          data: {
            title: 'ASKR EV Urban Mobility Fleet',
            subtitle: 'Smart • Connected • Sustainable',
            badgeText: 'ELECTRIC MOBILITY',
            buttonText: 'EXPLORE FLEET',
            desktopImageUrl:
              '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
            mobileImageUrl:
              '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
            linkUrl: '/dashboard',
            altText: 'ASKR EV Electric Mobility',
            displayOrder: 0,
            status: BannerStatus.PUBLISHED,
            isEnabled: true,
            autoplayInterval: 5000,
          },
        });
        this.logger.log('Seeded default Dashboard Top Banner.');
      }

      // 2. Ensure default Welcome Popup Campaign exists with EVERY_VISIT frequency
      const existingWelcome = await this.prisma.popupCampaign.findFirst({
        where: { name: 'ASKR EV Welcome' },
      });

      if (!existingWelcome) {
        await this.prisma.popupCampaign.create({
          data: {
            name: 'ASKR EV Welcome',
            heading: 'WELCOME TO ASKR EV',
            subheading: 'DRIVE THE ELECTRIC FUTURE',
            message:
              'Welcome to ASKR EV — your electric mobility journey starts here! Explore our EV solutions, discover your membership benefits, manage your bookings, and stay connected with your team — all in one place.',
            buttonText: 'EXPLORE DASHBOARD',
            buttonLink: '/dashboard',
            footerText: 'SMART MOBILITY • CONNECTED FUTURE',
            imageUrl: '/brand/askrev-full-logo.webp',
            frequency: PopupFrequency.EVERY_VISIT,
            status: BannerStatus.PUBLISHED,
          },
        });
        this.logger.log('Seeded initial ASKR EV Welcome Popup Campaign (EVERY_VISIT).');
      } else if (existingWelcome.frequency !== PopupFrequency.EVERY_VISIT) {
        await this.prisma.popupCampaign.update({
          where: { id: existingWelcome.id },
          data: { frequency: PopupFrequency.EVERY_VISIT },
        });
        this.logger.log('Updated existing ASKR EV Welcome Popup Campaign frequency to EVERY_VISIT.');
      }
    } catch (err: any) {
      this.logger.warn(`Banner defaults check notice: ${err.message}`);
    }
  }

  /**
   * Helper to format current date in IST ('YYYY-MM-DD')
   */
  private getTodayDateIST(date = new Date()): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  }

  /**
   * Computes human-readable operational status based on lifecycle dates and status enum
   */
  computeCampaignStatus(campaign: {
    status: BannerStatus;
    startDate: Date | null;
    endDate: Date | null;
  }): 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'DISABLED' {
    if (campaign.status === BannerStatus.DRAFT) return 'DRAFT';
    if (campaign.status === BannerStatus.DISABLED) return 'DISABLED';

    const now = new Date();
    if (campaign.startDate && campaign.startDate > now) {
      return 'SCHEDULED';
    }
    if (campaign.endDate && campaign.endDate < now) {
      return 'EXPIRED';
    }
    return 'ACTIVE';
  }

  /**
   * Computes human-readable operational status for a carousel slide
   */
  computeSlideStatus(slide: {
    status: BannerStatus;
    isEnabled: boolean;
    startDate: Date | null;
    endDate: Date | null;
  }): 'DRAFT' | 'SCHEDULED' | 'ACTIVE' | 'EXPIRED' | 'DISABLED' {
    if (!slide.isEnabled || slide.status === BannerStatus.DISABLED) return 'DISABLED';
    if (slide.status === BannerStatus.DRAFT) return 'DRAFT';
    if (slide.status === BannerStatus.ARCHIVED) return 'DISABLED';

    const now = new Date();
    if (slide.startDate && slide.startDate > now) {
      return 'SCHEDULED';
    }
    if (slide.endDate && slide.endDate < now) {
      return 'EXPIRED';
    }
    return 'ACTIVE';
  }

  // ===========================================================================
  // MEMBER-FACING DASHBOARD METHODS
  // ===========================================================================

  /**
   * Fetch active banners for authenticated member:
   * 1. Active Dashboard Top Banner & active slides (if enabled)
   * 2. Eligible Active Welcome Popup (respecting schedule, frequency, and dismissal)
   */
  async getActiveBanners(userId?: string) {
    const now = new Date();

    // Query published and enabled slides
    const allPublishedSlides = await this.prisma.dashboardTopBanner.findMany({
      where: {
        isEnabled: true,
        status: BannerStatus.PUBLISHED,
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    const activeSlides = allPublishedSlides.filter((slide) => {
      if (slide.startDate && slide.startDate > now) return false;
      if (slide.endDate && slide.endDate < now) return false;
      return true;
    });

    const topBanner = activeSlides[0] || null;

    if (!userId) {
      return {
        topBanner,
        slides: activeSlides,
        popupCampaign: null,
      };
    }

    // Query published campaigns
    const publishedCampaigns = await this.prisma.popupCampaign.findMany({
      where: {
        status: BannerStatus.PUBLISHED,
      },
      orderBy: { updatedAt: 'desc' },
    });

    // Filter by schedule
    const activeCampaigns = publishedCampaigns.filter((c) => {
      if (c.startDate && c.startDate > now) return false;
      if (c.endDate && c.endDate < now) return false;
      return true;
    });

    if (activeCampaigns.length === 0) {
      return {
        topBanner,
        slides: activeSlides,
        popupCampaign: null,
      };
    }

    // Evaluate candidate campaign against user dismissal records
    let eligibleCampaign: CampaignWithComputedStatus | null = null;
    const todayIST = this.getTodayDateIST(now);

    for (const campaign of activeCampaigns) {
      if (campaign.frequency === PopupFrequency.EVERY_VISIT) {
        eligibleCampaign = {
          ...campaign,
          computedStatus: 'ACTIVE',
        };
        break;
      }

      const dismissal = await this.prisma.popupDismissal.findUnique({
        where: {
          campaignId_userId: {
            campaignId: campaign.id,
            userId,
          },
        },
      });

      if (!dismissal) {
        // Not dismissed yet -> eligible
        eligibleCampaign = {
          ...campaign,
          computedStatus: 'ACTIVE',
        };
        break;
      }

      if (campaign.frequency === PopupFrequency.ONCE_DAILY) {
        // Eligible if lastSeenDate is not today IST
        if (dismissal.lastSeenDate !== todayIST) {
          eligibleCampaign = {
            ...campaign,
            computedStatus: 'ACTIVE',
          };
          break;
        }
      }
      // If ONCE_PER_CAMPAIGN and dismissal exists, skip
    }

    return {
      topBanner,
      slides: activeSlides,
      popupCampaign: eligibleCampaign,
    };
  }

  /**
   * Record member dismissal of a popup campaign
   */
  async recordDismissal(campaignId: string, userId: string) {
    const campaign = await this.prisma.popupCampaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      throw new NotFoundException('Popup campaign not found.');
    }

    const todayIST = this.getTodayDateIST();

    const dismissal = await this.prisma.popupDismissal.upsert({
      where: {
        campaignId_userId: {
          campaignId,
          userId,
        },
      },
      update: {
        dismissedAt: new Date(),
        lastSeenDate: todayIST,
      },
      create: {
        campaignId,
        userId,
        dismissedAt: new Date(),
        lastSeenDate: todayIST,
      },
    });

    return {
      success: true,
      dismissedAt: dismissal.dismissedAt,
      campaignId: dismissal.campaignId,
    };
  }

  // ===========================================================================
  // SUPER ADMIN MANAGEMENT METHODS
  // ===========================================================================

  /**
   * Get Top Banner settings for Admin
   */
  async getAdminTopBanner() {
    let banner = await this.prisma.dashboardTopBanner.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (!banner) {
      banner = await this.prisma.dashboardTopBanner.create({
        data: {
          title: 'ASKR EV Urban Mobility Fleet',
          badgeText: 'ELECTRIC MOBILITY',
          desktopImageUrl:
            '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
          mobileImageUrl:
            '/uploads/hero/desktop/urban-fleet-hero---harsil-leo-_1795105582720_1e863ffb12443fbf.webp',
          linkUrl: '/dashboard',
          altText: 'ASKR EV Electric Mobility',
          isEnabled: true,
        },
      });
    }

    return banner;
  }

  /**
   * Update or Create Top Banner
   */
  async updateTopBanner(dto: UpdateTopBannerDto) {
    const existing = await this.prisma.dashboardTopBanner.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (existing) {
      return this.prisma.dashboardTopBanner.update({
        where: { id: existing.id },
        data: {
          title: dto.title !== undefined ? dto.title : existing.title,
          subtitle: dto.subtitle !== undefined ? dto.subtitle : existing.subtitle,
          badgeText: dto.badgeText !== undefined ? dto.badgeText : existing.badgeText,
          buttonText: dto.buttonText !== undefined ? dto.buttonText : existing.buttonText,
          desktopImageUrl: dto.desktopImageUrl || existing.desktopImageUrl,
          mobileImageUrl:
            dto.mobileImageUrl !== undefined ? dto.mobileImageUrl : existing.mobileImageUrl,
          linkUrl: dto.linkUrl !== undefined ? dto.linkUrl : existing.linkUrl,
          altText: dto.altText !== undefined ? dto.altText : existing.altText,
          isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : existing.isEnabled,
          autoplayInterval:
            dto.autoplayInterval !== undefined ? dto.autoplayInterval : existing.autoplayInterval,
        },
      });
    }

    return this.prisma.dashboardTopBanner.create({
      data: {
        title: dto.title,
        subtitle: dto.subtitle,
        badgeText: dto.badgeText,
        buttonText: dto.buttonText,
        desktopImageUrl: dto.desktopImageUrl,
        mobileImageUrl: dto.mobileImageUrl,
        linkUrl: dto.linkUrl,
        altText: dto.altText,
        isEnabled: dto.isEnabled ?? true,
        autoplayInterval: dto.autoplayInterval ?? 5000,
      },
    });
  }

  // ===========================================================================
  // CAROUSEL SLIDES MANAGEMENT (SUPER ADMIN)
  // ===========================================================================

  /**
   * Get all carousel slides for Admin, ordered by displayOrder asc, createdAt asc
   */
  async getAdminSlides(): Promise<SlideWithComputedStatus[]> {
    const slides = await this.prisma.dashboardTopBanner.findMany({
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'asc' }],
    });

    return slides.map((s) => ({
      ...s,
      computedStatus: this.computeSlideStatus(s),
    }));
  }

  /**
   * Get single slide by ID
   */
  async getAdminSlideById(id: string): Promise<SlideWithComputedStatus> {
    const slide = await this.prisma.dashboardTopBanner.findUnique({
      where: { id },
    });
    if (!slide) {
      throw new NotFoundException(`Slide with ID "${id}" was not found.`);
    }
    return {
      ...slide,
      computedStatus: this.computeSlideStatus(slide),
    };
  }

  /**
   * Create a new slide
   */
  async createSlide(dto: CreateSlideDto): Promise<SlideWithComputedStatus> {
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dto.startDate) {
      startDate = new Date(dto.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Invalid start date format.');
      }
    }

    if (dto.endDate) {
      endDate = new Date(dto.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid end date format.');
      }
      if (startDate && endDate <= startDate) {
        throw new BadRequestException('End date must be after start date.');
      }
    }

    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined || displayOrder === null) {
      const highest = await this.prisma.dashboardTopBanner.findFirst({
        orderBy: { displayOrder: 'desc' },
        select: { displayOrder: true },
      });
      displayOrder = (highest?.displayOrder ?? -1) + 1;
    }

    const slide = await this.prisma.dashboardTopBanner.create({
      data: {
        title: dto.title?.trim() || null,
        subtitle: dto.subtitle?.trim() || null,
        badgeText: dto.badgeText?.trim() || null,
        buttonText: dto.buttonText?.trim() || null,
        desktopImageUrl: dto.desktopImageUrl.trim(),
        mobileImageUrl: dto.mobileImageUrl?.trim() || null,
        linkUrl: dto.linkUrl?.trim() || null,
        altText: dto.altText?.trim() || null,
        displayOrder,
        status: dto.status || BannerStatus.PUBLISHED,
        isEnabled: dto.isEnabled ?? true,
        startDate,
        endDate,
        autoplayInterval: dto.autoplayInterval ?? 5000,
      },
    });

    return {
      ...slide,
      computedStatus: this.computeSlideStatus(slide),
    };
  }

  /**
   * Update an existing slide
   */
  async updateSlide(id: string, dto: UpdateSlideDto): Promise<SlideWithComputedStatus> {
    const existing = await this.prisma.dashboardTopBanner.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Slide with ID "${id}" was not found.`);
    }

    let startDate: Date | null | undefined = undefined;
    let endDate: Date | null | undefined = undefined;

    if (dto.startDate !== undefined) {
      if (dto.startDate === null || dto.startDate === '') {
        startDate = null;
      } else {
        startDate = new Date(dto.startDate);
        if (isNaN(startDate.getTime())) {
          throw new BadRequestException('Invalid start date format.');
        }
      }
    }

    if (dto.endDate !== undefined) {
      if (dto.endDate === null || dto.endDate === '') {
        endDate = null;
      } else {
        endDate = new Date(dto.endDate);
        if (isNaN(endDate.getTime())) {
          throw new BadRequestException('Invalid end date format.');
        }
      }
    }

    const effectiveStart = startDate !== undefined ? startDate : existing.startDate;
    const effectiveEnd = endDate !== undefined ? endDate : existing.endDate;

    if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
      throw new BadRequestException('End date must be after start date.');
    }

    const updated = await this.prisma.dashboardTopBanner.update({
      where: { id },
      data: {
        title: dto.title !== undefined ? dto.title?.trim() || null : existing.title,
        subtitle: dto.subtitle !== undefined ? dto.subtitle?.trim() || null : existing.subtitle,
        badgeText: dto.badgeText !== undefined ? dto.badgeText?.trim() || null : existing.badgeText,
        buttonText: dto.buttonText !== undefined ? dto.buttonText?.trim() || null : existing.buttonText,
        desktopImageUrl: dto.desktopImageUrl !== undefined ? dto.desktopImageUrl.trim() : existing.desktopImageUrl,
        mobileImageUrl: dto.mobileImageUrl !== undefined ? dto.mobileImageUrl?.trim() || null : existing.mobileImageUrl,
        linkUrl: dto.linkUrl !== undefined ? dto.linkUrl?.trim() || null : existing.linkUrl,
        altText: dto.altText !== undefined ? dto.altText?.trim() || null : existing.altText,
        displayOrder: dto.displayOrder !== undefined ? dto.displayOrder : existing.displayOrder,
        status: dto.status !== undefined ? dto.status : existing.status,
        isEnabled: dto.isEnabled !== undefined ? dto.isEnabled : existing.isEnabled,
        startDate: startDate !== undefined ? startDate : existing.startDate,
        endDate: endDate !== undefined ? endDate : existing.endDate,
        autoplayInterval: dto.autoplayInterval !== undefined ? dto.autoplayInterval : existing.autoplayInterval,
      },
    });

    return {
      ...updated,
      computedStatus: this.computeSlideStatus(updated),
    };
  }

  /**
   * Delete a slide
   */
  async deleteSlide(id: string) {
    const existing = await this.prisma.dashboardTopBanner.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Slide with ID "${id}" was not found.`);
    }

    await this.prisma.dashboardTopBanner.delete({
      where: { id },
    });

    return { success: true, message: `Slide "${existing.title || id}" deleted successfully.` };
  }

  /**
   * Publish a slide
   */
  async publishSlide(id: string): Promise<SlideWithComputedStatus> {
    const existing = await this.prisma.dashboardTopBanner.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Slide with ID "${id}" was not found.`);
    }

    const updated = await this.prisma.dashboardTopBanner.update({
      where: { id },
      data: {
        status: BannerStatus.PUBLISHED,
        isEnabled: true,
      },
    });

    return {
      ...updated,
      computedStatus: this.computeSlideStatus(updated),
    };
  }

  /**
   * Disable a slide
   */
  async disableSlide(id: string): Promise<SlideWithComputedStatus> {
    const existing = await this.prisma.dashboardTopBanner.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Slide with ID "${id}" was not found.`);
    }

    const updated = await this.prisma.dashboardTopBanner.update({
      where: { id },
      data: {
        status: BannerStatus.DISABLED,
        isEnabled: false,
      },
    });

    return {
      ...updated,
      computedStatus: this.computeSlideStatus(updated),
    };
  }

  /**
   * Reorder slides in bulk
   */
  async reorderSlides(slideIds: string[]): Promise<SlideWithComputedStatus[]> {
    if (!slideIds || slideIds.length === 0) {
      throw new BadRequestException('slideIds array is required.');
    }

    await this.prisma.$transaction(
      slideIds.map((id, index) =>
        this.prisma.dashboardTopBanner.update({
          where: { id },
          data: { displayOrder: index },
        }),
      ),
    );

    return this.getAdminSlides();
  }

  /**
   * List all popup campaigns for Admin with computed status and dismissal counts
   */
  async getAdminPopupCampaigns(): Promise<CampaignWithComputedStatus[]> {
    const campaigns = await this.prisma.popupCampaign.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { dismissals: true },
        },
      },
    });

    return campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      heading: c.heading,
      subheading: c.subheading,
      message: c.message,
      buttonText: c.buttonText,
      buttonLink: c.buttonLink,
      footerText: c.footerText,
      imageUrl: c.imageUrl,
      frequency: c.frequency,
      status: c.status,
      computedStatus: this.computeCampaignStatus(c),
      startDate: c.startDate,
      endDate: c.endDate,
      createdBy: c.createdBy,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      dismissalCount: c._count.dismissals,
    }));
  }

  /**
   * Get single popup campaign by ID
   */
  async getAdminPopupCampaignById(id: string): Promise<CampaignWithComputedStatus> {
    const campaign = await this.prisma.popupCampaign.findUnique({
      where: { id },
      include: {
        _count: {
          select: { dismissals: true },
        },
      },
    });

    if (!campaign) {
      throw new NotFoundException(`Popup campaign with ID "${id}" was not found.`);
    }

    return {
      id: campaign.id,
      name: campaign.name,
      heading: campaign.heading,
      subheading: campaign.subheading,
      message: campaign.message,
      buttonText: campaign.buttonText,
      buttonLink: campaign.buttonLink,
      footerText: campaign.footerText,
      imageUrl: campaign.imageUrl,
      frequency: campaign.frequency,
      status: campaign.status,
      computedStatus: this.computeCampaignStatus(campaign),
      startDate: campaign.startDate,
      endDate: campaign.endDate,
      createdBy: campaign.createdBy,
      createdAt: campaign.createdAt,
      updatedAt: campaign.updatedAt,
      dismissalCount: campaign._count.dismissals,
    };
  }

  /**
   * Create a new popup campaign
   */
  async createPopupCampaign(dto: CreatePopupCampaignDto, adminId?: string) {
    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (dto.startDate) {
      startDate = new Date(dto.startDate);
      if (isNaN(startDate.getTime())) {
        throw new BadRequestException('Invalid start date format.');
      }
    }

    if (dto.endDate) {
      endDate = new Date(dto.endDate);
      if (isNaN(endDate.getTime())) {
        throw new BadRequestException('Invalid end date format.');
      }
      if (startDate && endDate <= startDate) {
        throw new BadRequestException('End date must be after start date.');
      }
    }

    const campaign = await this.prisma.popupCampaign.create({
      data: {
        name: dto.name.trim(),
        heading: dto.heading.trim(),
        subheading: dto.subheading?.trim() || null,
        message: dto.message.trim(),
        buttonText: dto.buttonText?.trim() || 'EXPLORE DASHBOARD',
        buttonLink: dto.buttonLink?.trim() || '/dashboard',
        footerText: dto.footerText?.trim() || 'SMART MOBILITY • CONNECTED FUTURE',
        imageUrl: dto.imageUrl?.trim() || null,
        frequency: dto.frequency || PopupFrequency.ONCE_PER_CAMPAIGN,
        status: dto.status || BannerStatus.DRAFT,
        startDate,
        endDate,
        createdBy: adminId || null,
      },
    });

    return {
      ...campaign,
      computedStatus: this.computeCampaignStatus(campaign),
    };
  }

  /**
   * Update an existing popup campaign
   */
  async updatePopupCampaign(id: string, dto: UpdatePopupCampaignDto, adminId?: string) {
    const existing = await this.prisma.popupCampaign.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Popup campaign with ID "${id}" was not found.`);
    }

    let startDate: Date | null | undefined = undefined;
    let endDate: Date | null | undefined = undefined;

    if (dto.startDate !== undefined) {
      if (dto.startDate === null || dto.startDate === '') {
        startDate = null;
      } else {
        startDate = new Date(dto.startDate);
        if (isNaN(startDate.getTime())) {
          throw new BadRequestException('Invalid start date format.');
        }
      }
    }

    if (dto.endDate !== undefined) {
      if (dto.endDate === null || dto.endDate === '') {
        endDate = null;
      } else {
        endDate = new Date(dto.endDate);
        if (isNaN(endDate.getTime())) {
          throw new BadRequestException('Invalid end date format.');
        }
      }
    }

    const effectiveStart = startDate !== undefined ? startDate : existing.startDate;
    const effectiveEnd = endDate !== undefined ? endDate : existing.endDate;

    if (effectiveStart && effectiveEnd && effectiveEnd <= effectiveStart) {
      throw new BadRequestException('End date must be after start date.');
    }

    const updated = await this.prisma.popupCampaign.update({
      where: { id },
      data: {
        name: dto.name !== undefined ? dto.name.trim() : existing.name,
        heading: dto.heading !== undefined ? dto.heading.trim() : existing.heading,
        subheading: dto.subheading !== undefined ? dto.subheading?.trim() || null : existing.subheading,
        message: dto.message !== undefined ? dto.message.trim() : existing.message,
        buttonText: dto.buttonText !== undefined ? dto.buttonText?.trim() || 'EXPLORE DASHBOARD' : existing.buttonText,
        buttonLink: dto.buttonLink !== undefined ? dto.buttonLink?.trim() || '/dashboard' : existing.buttonLink,
        footerText: dto.footerText !== undefined ? dto.footerText?.trim() || null : existing.footerText,
        imageUrl: dto.imageUrl !== undefined ? dto.imageUrl?.trim() || null : existing.imageUrl,
        frequency: dto.frequency !== undefined ? dto.frequency : existing.frequency,
        status: dto.status !== undefined ? dto.status : existing.status,
        startDate: startDate !== undefined ? startDate : existing.startDate,
        endDate: endDate !== undefined ? endDate : existing.endDate,
      },
    });

    return {
      ...updated,
      computedStatus: this.computeCampaignStatus(updated),
    };
  }

  /**
   * Publish a campaign
   */
  async publishPopupCampaign(id: string) {
    const existing = await this.prisma.popupCampaign.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Popup campaign with ID "${id}" was not found.`);
    }

    const updated = await this.prisma.popupCampaign.update({
      where: { id },
      data: {
        status: BannerStatus.PUBLISHED,
      },
    });

    return {
      ...updated,
      computedStatus: this.computeCampaignStatus(updated),
    };
  }

  /**
   * Disable a campaign
   */
  async disablePopupCampaign(id: string) {
    const existing = await this.prisma.popupCampaign.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Popup campaign with ID "${id}" was not found.`);
    }

    const updated = await this.prisma.popupCampaign.update({
      where: { id },
      data: {
        status: BannerStatus.DISABLED,
      },
    });

    return {
      ...updated,
      computedStatus: this.computeCampaignStatus(updated),
    };
  }

  /**
   * Delete a campaign (only allowed for drafts or disabled)
   */
  async deletePopupCampaign(id: string) {
    const existing = await this.prisma.popupCampaign.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Popup campaign with ID "${id}" was not found.`);
    }

    await this.prisma.popupCampaign.delete({
      where: { id },
    });

    return { success: true, message: `Campaign "${existing.name}" deleted.` };
  }
}

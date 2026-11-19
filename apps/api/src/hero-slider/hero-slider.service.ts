import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHeroSlideDto } from './dto/create-hero-slide.dto';
import { UpdateHeroSlideDto } from './dto/update-hero-slide.dto';
import { AdminHeroSliderQueryDto } from './dto/hero-slide-query.dto';
import { HeroSlideStatus, paiseToRupees } from '@askrev/shared';

@Injectable()
export class HeroSliderService implements OnModuleInit {
  private readonly logger = new Logger(HeroSliderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.seedDefaultSlidesIfEmpty();
  }

  /**
   * Safe formatter for linked product entity (converts BigInts to string/number).
   */
  private formatLinkedProduct(p: any) {
    if (!p) return null;
    const sellingINR = p.sellingPricePaise ? paiseToRupees(p.sellingPricePaise) : null;
    const regularINR = p.regularPricePaise ? paiseToRupees(p.regularPricePaise) : null;
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      category: p.category,
      brand: p.brand || 'ASKR EV',
      sellingPriceINR: sellingINR,
      regularPriceINR: regularINR,
      formattedSellingPrice: sellingINR ? `₹${sellingINR.toLocaleString('en-IN')}` : 'Contact for Price',
      heroImage: p.heroImage || (Array.isArray(p.images) && p.images[0] ? p.images[0].url : ''),
      thumbnailImage: p.thumbnailImage || '',
      rangeKm: p.rangeKm,
      topSpeedKmh: p.topSpeedKmh,
      batteryCapacityKwh: p.batteryCapacityKwh,
      chargingTimeHours: p.chargingTimeHours,
      motorPower: p.motorPower,
    };
  }

  /**
   * Helper to format a slide for API responses.
   */
  private formatSlide(slide: any) {
    if (!slide) return null;
    return {
      id: slide.id,
      internalName: slide.internalName,
      heading: slide.heading,
      subheading: slide.subheading || null,
      description: slide.description || null,
      eyebrowText: slide.eyebrowText || null,
      desktopImageUrl: slide.desktopImageUrl,
      mobileImageUrl: slide.mobileImageUrl || slide.desktopImageUrl,
      desktopFocalX: slide.desktopFocalX ?? 50.0,
      desktopFocalY: slide.desktopFocalY ?? 50.0,
      mobileFocalX: slide.mobileFocalX ?? 50.0,
      mobileFocalY: slide.mobileFocalY ?? 50.0,
      desktopAltText: slide.desktopAltText || slide.heading,
      mobileAltText: slide.mobileAltText || slide.heading,
      primaryCtaLabel: slide.primaryCtaLabel || 'EXPLORE VEHICLES',
      primaryCtaUrl: slide.primaryCtaUrl || '/scooters',
      primaryCtaStyle: slide.primaryCtaStyle || 'PRIMARY',
      primaryCtaEnabled: slide.primaryCtaEnabled ?? true,
      secondaryCtaLabel: slide.secondaryCtaLabel || 'BOOK TEST DRIVE',
      secondaryCtaUrl: slide.secondaryCtaUrl || '/test-ride',
      secondaryCtaStyle: slide.secondaryCtaStyle || 'SECONDARY',
      secondaryCtaEnabled: slide.secondaryCtaEnabled ?? false,
      linkedProductId: slide.linkedProductId || null,
      linkedProduct: slide.linkedProduct ? this.formatLinkedProduct(slide.linkedProduct) : null,
      showPrice: slide.showPrice ?? false,
      showRange: slide.showRange ?? false,
      showTopSpeed: slide.showTopSpeed ?? false,
      showBattery: slide.showBattery ?? false,
      showSpecifications: slide.showSpecifications ?? false,
      sortOrder: slide.sortOrder ?? 0,
      status: slide.status,
      publishStartAt: slide.publishStartAt ? slide.publishStartAt.toISOString() : null,
      publishEndAt: slide.publishEndAt ? slide.publishEndAt.toISOString() : null,
      createdBy: slide.createdBy || null,
      updatedBy: slide.updatedBy || null,
      version: slide.version ?? 1,
      createdAt: slide.createdAt.toISOString(),
      updatedAt: slide.updatedAt.toISOString(),
    };
  }

  /**
   * Public storefront query.
   * If isPreview is true, returns PUBLISHED and DRAFT slides.
   * Otherwise, returns strictly PUBLISHED slides within active scheduling window.
   */
  async getPublicSlides(isPreview = false) {
    const now = new Date();

    const whereClause: any = isPreview
      ? { status: { in: [HeroSlideStatus.PUBLISHED, HeroSlideStatus.DRAFT] } }
      : {
          status: HeroSlideStatus.PUBLISHED,
          AND: [
            {
              OR: [{ publishStartAt: null }, { publishStartAt: { lte: now } }],
            },
            {
              OR: [{ publishEndAt: null }, { publishEndAt: { gte: now } }],
            },
          ],
        };

    let slides = await this.prisma.homepageHeroSlide.findMany({
      where: whereClause,
      orderBy: { sortOrder: 'asc' },
      include: {
        linkedProduct: true,
      },
    });

    if (slides.length === 0 && !isPreview) {
      // If table is completely empty, trigger seed and refetch
      const totalCount = await this.prisma.homepageHeroSlide.count();
      if (totalCount === 0) {
        await this.seedDefaultSlidesIfEmpty();
        slides = await this.prisma.homepageHeroSlide.findMany({
          where: whereClause,
          orderBy: { sortOrder: 'asc' },
          include: {
            linkedProduct: true,
          },
        });
      }
    }

    return slides.map((s) => this.formatSlide(s));
  }

  /**
   * Admin: List all hero slides with optional filters.
   */
  async getAdminSlides(query: AdminHeroSliderQueryDto) {
    const whereClause: any = {};

    if (query.status) {
      whereClause.status = query.status;
    }

    if (query.search?.trim()) {
      const q = query.search.trim();
      whereClause.OR = [
        { internalName: { contains: q, mode: 'insensitive' } },
        { heading: { contains: q, mode: 'insensitive' } },
        { subheading: { contains: q, mode: 'insensitive' } },
      ];
    }

    const slides = await this.prisma.homepageHeroSlide.findMany({
      where: whereClause,
      orderBy: [{ sortOrder: 'asc' }, { updatedAt: 'desc' }],
      include: {
        linkedProduct: true,
      },
    });

    return slides.map((s) => this.formatSlide(s));
  }

  /**
   * Admin: Get slide by ID.
   */
  async getSlideById(id: string) {
    const slide = await this.prisma.homepageHeroSlide.findUnique({
      where: { id },
      include: { linkedProduct: true },
    });
    if (!slide) {
      throw new NotFoundException(`Hero slide with ID ${id} not found`);
    }
    return this.formatSlide(slide);
  }

  /**
   * Admin: Create a new hero slide.
   */
  async createSlide(dto: CreateHeroSlideDto, userId?: string) {
    // If sortOrder not provided or 0, compute next sortOrder
    let sortOrder = dto.sortOrder ?? 0;
    if (!sortOrder) {
      const maxSlide = await this.prisma.homepageHeroSlide.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (maxSlide?.sortOrder ?? 0) + 1;
    }

    // Verify linked product exists if provided
    if (dto.linkedProductId) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.linkedProductId },
        select: { id: true },
      });
      if (!product) {
        throw new BadRequestException(`Linked product ID ${dto.linkedProductId} not found`);
      }
    }

    const created = await this.prisma.homepageHeroSlide.create({
      data: {
        internalName: dto.internalName.trim(),
        heading: dto.heading.trim(),
        subheading: dto.subheading?.trim() || null,
        description: dto.description?.trim() || null,
        eyebrowText: dto.eyebrowText?.trim() || null,
        desktopImageUrl: dto.desktopImageUrl.trim(),
        mobileImageUrl: dto.mobileImageUrl?.trim() || null,
        desktopFocalX: dto.desktopFocalX ?? 50.0,
        desktopFocalY: dto.desktopFocalY ?? 50.0,
        mobileFocalX: dto.mobileFocalX ?? 50.0,
        mobileFocalY: dto.mobileFocalY ?? 50.0,
        desktopAltText: dto.desktopAltText?.trim() || null,
        mobileAltText: dto.mobileAltText?.trim() || null,
        primaryCtaLabel: dto.primaryCtaLabel?.trim() || 'EXPLORE VEHICLES',
        primaryCtaUrl: dto.primaryCtaUrl?.trim() || '/scooters',
        primaryCtaStyle: dto.primaryCtaStyle || 'PRIMARY',
        primaryCtaEnabled: dto.primaryCtaEnabled ?? true,
        secondaryCtaLabel: dto.secondaryCtaLabel?.trim() || null,
        secondaryCtaUrl: dto.secondaryCtaUrl?.trim() || null,
        secondaryCtaStyle: dto.secondaryCtaStyle || 'SECONDARY',
        secondaryCtaEnabled: dto.secondaryCtaEnabled ?? false,
        linkedProductId: dto.linkedProductId || null,
        showPrice: dto.showPrice ?? false,
        showRange: dto.showRange ?? false,
        showTopSpeed: dto.showTopSpeed ?? false,
        showBattery: dto.showBattery ?? false,
        showSpecifications: dto.showSpecifications ?? false,
        sortOrder,
        status: dto.status || HeroSlideStatus.DRAFT,
        publishStartAt: dto.publishStartAt ? new Date(dto.publishStartAt) : null,
        publishEndAt: dto.publishEndAt ? new Date(dto.publishEndAt) : null,
        createdBy: userId || 'ADMIN',
        updatedBy: userId || 'ADMIN',
        version: 1,
      },
      include: {
        linkedProduct: true,
      },
    });

    this.logger.log(`Created hero slide "${created.internalName}" [${created.id}]`);
    return this.formatSlide(created);
  }

  /**
   * Admin: Update an existing hero slide.
   */
  async updateSlide(id: string, dto: UpdateHeroSlideDto, userId?: string) {
    const existing = await this.prisma.homepageHeroSlide.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new NotFoundException(`Hero slide with ID ${id} not found`);
    }

    if (dto.linkedProductId) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.linkedProductId },
        select: { id: true },
      });
      if (!product) {
        throw new BadRequestException(`Linked product ID ${dto.linkedProductId} not found`);
      }
    }

    const updated = await this.prisma.homepageHeroSlide.update({
      where: { id },
      data: {
        ...(dto.internalName !== undefined && { internalName: dto.internalName.trim() }),
        ...(dto.heading !== undefined && { heading: dto.heading.trim() }),
        ...(dto.subheading !== undefined && { subheading: dto.subheading?.trim() || null }),
        ...(dto.description !== undefined && { description: dto.description?.trim() || null }),
        ...(dto.eyebrowText !== undefined && { eyebrowText: dto.eyebrowText?.trim() || null }),
        ...(dto.desktopImageUrl !== undefined && { desktopImageUrl: dto.desktopImageUrl.trim() }),
        ...(dto.mobileImageUrl !== undefined && { mobileImageUrl: dto.mobileImageUrl?.trim() || null }),
        ...(dto.desktopFocalX !== undefined && { desktopFocalX: dto.desktopFocalX }),
        ...(dto.desktopFocalY !== undefined && { desktopFocalY: dto.desktopFocalY }),
        ...(dto.mobileFocalX !== undefined && { mobileFocalX: dto.mobileFocalX }),
        ...(dto.mobileFocalY !== undefined && { mobileFocalY: dto.mobileFocalY }),
        ...(dto.desktopAltText !== undefined && { desktopAltText: dto.desktopAltText?.trim() || null }),
        ...(dto.mobileAltText !== undefined && { mobileAltText: dto.mobileAltText?.trim() || null }),
        ...(dto.primaryCtaLabel !== undefined && { primaryCtaLabel: dto.primaryCtaLabel?.trim() || null }),
        ...(dto.primaryCtaUrl !== undefined && { primaryCtaUrl: dto.primaryCtaUrl?.trim() || null }),
        ...(dto.primaryCtaStyle !== undefined && { primaryCtaStyle: dto.primaryCtaStyle }),
        ...(dto.primaryCtaEnabled !== undefined && { primaryCtaEnabled: dto.primaryCtaEnabled }),
        ...(dto.secondaryCtaLabel !== undefined && { secondaryCtaLabel: dto.secondaryCtaLabel?.trim() || null }),
        ...(dto.secondaryCtaUrl !== undefined && { secondaryCtaUrl: dto.secondaryCtaUrl?.trim() || null }),
        ...(dto.secondaryCtaStyle !== undefined && { secondaryCtaStyle: dto.secondaryCtaStyle }),
        ...(dto.secondaryCtaEnabled !== undefined && { secondaryCtaEnabled: dto.secondaryCtaEnabled }),
        ...(dto.linkedProductId !== undefined && { linkedProductId: dto.linkedProductId || null }),
        ...(dto.showPrice !== undefined && { showPrice: dto.showPrice }),
        ...(dto.showRange !== undefined && { showRange: dto.showRange }),
        ...(dto.showTopSpeed !== undefined && { showTopSpeed: dto.showTopSpeed }),
        ...(dto.showBattery !== undefined && { showBattery: dto.showBattery }),
        ...(dto.showSpecifications !== undefined && { showSpecifications: dto.showSpecifications }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.publishStartAt !== undefined && {
          publishStartAt: dto.publishStartAt ? new Date(dto.publishStartAt) : null,
        }),
        ...(dto.publishEndAt !== undefined && {
          publishEndAt: dto.publishEndAt ? new Date(dto.publishEndAt) : null,
        }),
        updatedBy: userId || 'ADMIN',
        version: { increment: 1 },
      },
      include: {
        linkedProduct: true,
      },
    });

    this.logger.log(`Updated hero slide "${updated.internalName}" [${updated.id}]`);
    return this.formatSlide(updated);
  }

  /**
   * Admin: Reorder slides transactionally.
   */
  async reorderSlides(slideIds: string[]) {
    if (!Array.isArray(slideIds) || slideIds.length === 0) {
      throw new BadRequestException('Slide IDs array is required for reordering');
    }

    await this.prisma.$transaction(
      slideIds.map((id, index) =>
        this.prisma.homepageHeroSlide.update({
          where: { id },
          data: { sortOrder: index + 1, version: { increment: 1 } },
        })
      )
    );

    this.logger.log(`Reordered ${slideIds.length} hero slides successfully`);
    return { success: true, count: slideIds.length };
  }

  /**
   * Admin: Publish slide.
   */
  async publishSlide(id: string, userId?: string) {
    const existing = await this.prisma.homepageHeroSlide.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Hero slide with ID ${id} not found`);
    }

    const updated = await this.prisma.homepageHeroSlide.update({
      where: { id },
      data: {
        status: HeroSlideStatus.PUBLISHED,
        updatedBy: userId || 'ADMIN',
        version: { increment: 1 },
      },
      include: { linkedProduct: true },
    });

    this.logger.log(`Published hero slide "${updated.internalName}" [${updated.id}]`);
    return this.formatSlide(updated);
  }

  /**
   * Admin: Unpublish slide (change to DRAFT).
   */
  async unpublishSlide(id: string, userId?: string) {
    const existing = await this.prisma.homepageHeroSlide.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Hero slide with ID ${id} not found`);
    }

    const updated = await this.prisma.homepageHeroSlide.update({
      where: { id },
      data: {
        status: HeroSlideStatus.DRAFT,
        updatedBy: userId || 'ADMIN',
        version: { increment: 1 },
      },
      include: { linkedProduct: true },
    });

    this.logger.log(`Unpublished hero slide "${updated.internalName}" [${updated.id}]`);
    return this.formatSlide(updated);
  }

  /**
   * Admin: Duplicate an existing slide.
   */
  async duplicateSlide(id: string, userId?: string) {
    const source = await this.prisma.homepageHeroSlide.findUnique({ where: { id } });
    if (!source) {
      throw new NotFoundException(`Hero slide with ID ${id} not found`);
    }

    const maxSlide = await this.prisma.homepageHeroSlide.findFirst({
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true },
    });
    const newSortOrder = (maxSlide?.sortOrder ?? 0) + 1;

    const duplicated = await this.prisma.homepageHeroSlide.create({
      data: {
        internalName: `${source.internalName} (Copy)`,
        heading: source.heading,
        subheading: source.subheading,
        description: source.description,
        eyebrowText: source.eyebrowText,
        desktopImageUrl: source.desktopImageUrl,
        mobileImageUrl: source.mobileImageUrl,
        desktopFocalX: source.desktopFocalX,
        desktopFocalY: source.desktopFocalY,
        mobileFocalX: source.mobileFocalX,
        mobileFocalY: source.mobileFocalY,
        desktopAltText: source.desktopAltText,
        mobileAltText: source.mobileAltText,
        primaryCtaLabel: source.primaryCtaLabel,
        primaryCtaUrl: source.primaryCtaUrl,
        primaryCtaStyle: source.primaryCtaStyle,
        primaryCtaEnabled: source.primaryCtaEnabled,
        secondaryCtaLabel: source.secondaryCtaLabel,
        secondaryCtaUrl: source.secondaryCtaUrl,
        secondaryCtaStyle: source.secondaryCtaStyle,
        secondaryCtaEnabled: source.secondaryCtaEnabled,
        linkedProductId: source.linkedProductId,
        showPrice: source.showPrice,
        showRange: source.showRange,
        showTopSpeed: source.showTopSpeed,
        showBattery: source.showBattery,
        showSpecifications: source.showSpecifications,
        sortOrder: newSortOrder,
        status: HeroSlideStatus.DRAFT,
        createdBy: userId || 'ADMIN',
        updatedBy: userId || 'ADMIN',
        version: 1,
      },
      include: { linkedProduct: true },
    });

    this.logger.log(`Duplicated hero slide [${source.id}] -> [${duplicated.id}]`);
    return this.formatSlide(duplicated);
  }

  /**
   * Admin: Delete or archive a slide.
   */
  async deleteSlide(id: string) {
    const existing = await this.prisma.homepageHeroSlide.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Hero slide with ID ${id} not found`);
    }

    if (existing.status === HeroSlideStatus.ARCHIVED) {
      // Hard delete if already archived
      await this.prisma.homepageHeroSlide.delete({ where: { id } });
      this.logger.log(`Hard deleted archived hero slide [${id}]`);
      return { success: true, hardDeleted: true };
    }

    // Otherwise soft delete (archive)
    const archived = await this.prisma.homepageHeroSlide.update({
      where: { id },
      data: { status: HeroSlideStatus.ARCHIVED, version: { increment: 1 } },
    });
    this.logger.log(`Archived hero slide "${archived.internalName}" [${id}]`);
    return { success: true, archived: true };
  }

  /**
   * Automatically seed clean baseline slides if table is completely empty.
   */
  async seedDefaultSlidesIfEmpty() {
    try {
      const count = await this.prisma.homepageHeroSlide.count();
      if (count > 0) return;

      this.logger.log('Seeding initial baseline Homepage Hero Slides with real fleet imagery...');

      // Attempt to link to real products if available
      const jatayuProduct = await this.prisma.product.findFirst({
        where: { slug: { contains: 'jatayu' } },
        select: { id: true },
      });
      const harsilProduct = await this.prisma.product.findFirst({
        where: { slug: { contains: 'harsil-leo' } },
        select: { id: true },
      });
      const jeepProduct = await this.prisma.product.findFirst({
        where: { slug: { contains: 'monster-jeep' } },
        select: { id: true },
      });

      const initialSlides = [
        {
          internalName: 'Primary Fleet Hero - Jatayu Orange',
          heading: 'DRIVE THE FUTURE. DRIVE ELECTRIC.',
          subheading: 'Engineered for Performance. Designed for Bharat.',
          description:
            'Experience effortless urban commutes with our high-torque electric powertrains, intelligent battery management, and ultra-durable chassis.',
          eyebrowText: 'NEXT-GEN EV PLATFORM',
          desktopImageUrl: '/images/real/real-jatayu-orange-studio.jpg',
          mobileImageUrl: '/images/real/real-jatayu-orange-studio.jpg',
          desktopFocalX: 50.0,
          desktopFocalY: 50.0,
          mobileFocalX: 50.0,
          mobileFocalY: 50.0,
          desktopAltText: 'ASKR EV High-Torque Electric Motorcycle in Sunset Orange',
          mobileAltText: 'ASKR EV Electric Motorcycle',
          primaryCtaLabel: 'EXPLORE VEHICLES',
          primaryCtaUrl: '/scooters',
          primaryCtaStyle: 'PRIMARY',
          primaryCtaEnabled: true,
          secondaryCtaLabel: 'BOOK TEST DRIVE',
          secondaryCtaUrl: '/test-ride',
          secondaryCtaStyle: 'SECONDARY',
          secondaryCtaEnabled: true,
          linkedProductId: jatayuProduct?.id || null,
          showPrice: false,
          showRange: true,
          showTopSpeed: true,
          showBattery: false,
          showSpecifications: false,
          sortOrder: 1,
          status: HeroSlideStatus.PUBLISHED,
          createdBy: 'SYSTEM_SEED',
          updatedBy: 'SYSTEM_SEED',
        },
        {
          internalName: 'Urban Fleet Hero - Harsil Leo Series',
          heading: 'ENGINEERED FOR URBAN PRECISION',
          subheading: 'High-Efficiency Electric Scooters for Daily Commutes',
          description:
            'Featuring swappable lithium battery architecture, silent hub motor power, and best-in-class under-seat cargo capacity.',
          eyebrowText: 'ZERO EMISSIONS • MAXIMUM RANGE',
          desktopImageUrl: '/images/real/real-harsil-leo-scooter-lineup.jpg',
          mobileImageUrl: '/images/real/real-harsil-leo-scooter-lineup.jpg',
          desktopFocalX: 50.0,
          desktopFocalY: 50.0,
          mobileFocalX: 50.0,
          mobileFocalY: 50.0,
          desktopAltText: 'ASKR EV Urban Electric Scooter Lineup',
          mobileAltText: 'ASKR EV Electric Scooters',
          primaryCtaLabel: 'VIEW SCOOTERS',
          primaryCtaUrl: '/scooters',
          primaryCtaStyle: 'PRIMARY',
          primaryCtaEnabled: true,
          secondaryCtaLabel: 'LOCATE DEALER',
          secondaryCtaUrl: '/dealers',
          secondaryCtaStyle: 'OUTLINE',
          secondaryCtaEnabled: true,
          linkedProductId: harsilProduct?.id || null,
          showPrice: false,
          showRange: true,
          showTopSpeed: false,
          showBattery: false,
          showSpecifications: false,
          sortOrder: 2,
          status: HeroSlideStatus.PUBLISHED,
          createdBy: 'SYSTEM_SEED',
          updatedBy: 'SYSTEM_SEED',
        },
        {
          internalName: 'Adventure Fleet Hero - 4x4 Monster Jeep',
          heading: 'CONQUER EVERY TERRAIN. EMISSION FREE.',
          subheading: 'Dual Motor All-Electric 4x4 Utility & Adventure',
          description:
            'Built with heavy-duty tubular steel chassis, dual high-torque motors, and deep-tread all-terrain tires for commercial and lifestyle applications.',
          eyebrowText: 'HEAVY-DUTY ELECTRIC UTILITY',
          desktopImageUrl: '/images/real/real-monster-jeep-black-front.jpg',
          mobileImageUrl: '/images/real/real-monster-jeep-black-front.jpg',
          desktopFocalX: 50.0,
          desktopFocalY: 50.0,
          mobileFocalX: 50.0,
          mobileFocalY: 50.0,
          desktopAltText: 'ASKR EV All-Terrain 4x4 Electric Monster Jeep',
          mobileAltText: 'ASKR EV 4x4 Electric Jeep',
          primaryCtaLabel: 'DISCOVER UTILITY',
          primaryCtaUrl: '/jeeps',
          primaryCtaStyle: 'PRIMARY',
          primaryCtaEnabled: true,
          secondaryCtaLabel: 'FLEET ENQUIRY',
          secondaryCtaUrl: '/contact',
          secondaryCtaStyle: 'SECONDARY',
          secondaryCtaEnabled: true,
          linkedProductId: jeepProduct?.id || null,
          showPrice: false,
          showRange: true,
          showTopSpeed: true,
          showBattery: true,
          showSpecifications: false,
          sortOrder: 3,
          status: HeroSlideStatus.PUBLISHED,
          createdBy: 'SYSTEM_SEED',
          updatedBy: 'SYSTEM_SEED',
        },
      ];

      for (const slide of initialSlides) {
        await this.prisma.homepageHeroSlide.create({ data: slide });
      }

      this.logger.log('Successfully seeded 3 baseline Homepage Hero Slides');
    } catch (err: any) {
      this.logger.error(`Error seeding default hero slides: ${err.message}`);
    }
  }
}

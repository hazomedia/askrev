import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PublicCatalogQueryDto, AdminProductQueryDto } from './dto/product-query.dto';
import { ProductCategory, ProductStatus, paiseToRupees } from '@askrev/shared';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Helper: Formats a Prisma Product entity for API response.
   * Converts integer paise BigInt fields into INR rupees numbers.
   */
  private formatProduct(p: any, isAdmin: boolean = false) {
    if (!p) return null;

    const sellingINR = p.sellingPricePaise ? paiseToRupees(p.sellingPricePaise) : null;
    const regularINR = p.regularPricePaise ? paiseToRupees(p.regularPricePaise) : null;
    const bookingINR = p.bookingAmountPaise ? paiseToRupees(p.bookingAmountPaise) : null;
    const heroImg = p.heroImage || (p.images && p.images[0] ? p.images[0].url : '');

    const specsList = Array.isArray(p.specifications) ? p.specifications : [];
    const payloadSpec = specsList.find((s: any) => /load capacity|payload/i.test(s.label || ''));
    let payloadCapacityKg: number | null = null;
    if (payloadSpec?.value) {
      const match = String(payloadSpec.value).match(/\d+/);
      if (match) payloadCapacityKg = parseInt(match[0], 10);
    }

    const result: any = {
      id: p.id,
      name: p.name,
      slug: p.slug,
      modelCode: p.modelCode || (p.slug ? p.slug.toUpperCase() : ''),
      category: p.category,
      categoryLabel: this.getCategoryLabel(p.category),
      brand: p.brand || 'ASKR EV',
      manufacturer: p.brand || 'ASKR EV Mobility',
      tagline: p.tagline || '',
      shortDescription: p.shortDescription || p.tagline || '',
      fullDescription: p.fullDescription || '',
      regularPriceINR: regularINR,
      sellingPriceINR: sellingINR,
      exShowroomPriceINR: sellingINR,
      bookingAmountINR: bookingINR,
      voucherRedeemLimitINR: p.voucherRedeemLimitPaise ? paiseToRupees(p.voucherRedeemLimitPaise) : null,
      formattedSellingPrice: sellingINR ? `₹${sellingINR.toLocaleString('en-IN')}` : '',
      formattedRegularPrice: regularINR ? `₹${regularINR.toLocaleString('en-IN')}` : '',
      formattedBookingAmount: bookingINR ? `₹${bookingINR.toLocaleString('en-IN')}` : '',
      regularPricePaise: p.regularPricePaise ? p.regularPricePaise.toString() : null,
      sellingPricePaise: p.sellingPricePaise ? p.sellingPricePaise.toString() : null,
      bookingAmountPaise: p.bookingAmountPaise ? p.bookingAmountPaise.toString() : null,
      voucherRedeemLimitPaise: p.voucherRedeemLimitPaise ? p.voucherRedeemLimitPaise.toString() : null,
      rangeKm: p.rangeKm,
      topSpeedKmh: p.topSpeedKmh,
      batteryCapacityKwh: p.batteryCapacityKwh,
      chargingTimeHours: p.chargingTimeHours,
      motorPower: p.motorPower,
      acceleration: p.acceleration,
      warranty: p.warranty,
      powertrain: p.powertrain,
      payloadCapacityKg,
      colors: p.colors || [],
      specifications: p.specifications || [],
      specs: p.specifications || [],
      highlights: p.highlights || [],
      images: p.images || [],
      heroImage: heroImg,
      imageUrl: heroImg,
      thumbnailImage: p.thumbnailImage || heroImg,
      isHero: p.isHero ?? false,
      heroMobileImage: p.heroMobileImage || null,
      heroHeading: p.heroHeading || null,
      heroDescription: p.heroDescription || null,
      heroCtaText: p.heroCtaText || null,
      heroCtaLink: p.heroCtaLink || null,
      heroSlideOrder: p.heroSlideOrder ?? null,
      isBookable: Boolean(p.bookingAmountPaise && BigInt(p.bookingAmountPaise) > 0n),
      statusBadge: p.bookingAmountPaise && BigInt(p.bookingAmountPaise) > 0n ? 'Bookings Open' : 'Showroom Showcase',
      isFeatured: p.isFeatured,
      status: p.status,
      displayOrder: p.displayOrder,
      slugAliases: p.slugAliases || [],
      isRebranded: p.isRebranded ?? true,
      evBikeId: p.evBikeId,
      createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
    };

    // Internal OEM & Supplier Traceability strictly scoped to Admin views
    // Never leaked in customer-facing showroom or public API responses
    if (isAdmin) {
      result.oemManufacturer = p.oemManufacturer || null;
      result.oemModelName = p.oemModelName || null;
      result.oemReference = p.oemReference || null;
      result.internalNotes = p.internalNotes || null;
    }

    return result;
  }

  private getCategoryLabel(category: string): string {
    switch (category?.toUpperCase()) {
      case 'SCOOTER':
        return 'Electric Scooter';
      case 'BIKE':
        return 'Electric Motorcycle';
      case 'CYCLE':
        return 'Electric Cycle';
      case 'JEEP':
        return 'Electric 4x4 Jeep';
      case 'UTILITY':
        return 'Electric Utility Vehicle';
      default:
        return 'Electric Vehicle';
    }
  }

  private mapCategoryEnum(catStr?: string): ProductCategory | undefined {
    if (!catStr) return undefined;
    const clean = catStr.toUpperCase().trim();
    if (clean === 'SCOOTER' || clean === 'SCOOTERS') return ProductCategory.SCOOTER;
    if (clean === 'BIKE' || clean === 'BIKES' || clean === 'MOTORCYCLE' || clean === 'MOTORCYCLES') return ProductCategory.BIKE;
    if (clean === 'CYCLE' || clean === 'CYCLES' || clean === 'BICYCLE') return ProductCategory.CYCLE;
    if (clean === 'JEEP' || clean === 'JEEPS' || clean === '4X4') return ProductCategory.JEEP;
    if (clean === 'UTILITY' || clean === 'UTILITIES' || clean === 'LOADER' || clean === 'COMMERCIAL') return ProductCategory.UTILITY;
    return undefined;
  }

  /**
   * Generates a unique URL slug from a product name.
   */
  async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug || 'ev-model';
    let counter = 1;

    while (true) {
      const existing = await this.prisma.product.findUnique({
        where: { slug },
      });

      if (!existing || (excludeId && existing.id === excludeId)) {
        return slug;
      }

      counter++;
      slug = `${baseSlug}-${counter}`;
    }
  }

  // ===========================================================================
  // PUBLIC SHOWROOM CATALOG METHODS
  // ===========================================================================

  // 9 Legacy demo vehicle slugs preserved for production compatibility but strictly
  // excluded from authenticated Real Fleet Preview Presentation
  public static readonly LEGACY_DEMO_SLUGS = [
    'thunder-pro',
    'scooter-s1-air',
    'terramax-4x4',
    'apex-sport',
    'terramax-urban',
    'scooter-s1-pro',
    'city-cruise',
    'aerotrek-c1',
    'aerotrek-trail',
  ];

  async getPublishedCatalog(query?: PublicCatalogQueryDto, includeDrafts: boolean = false) {
    const where: any = {};

    if (!includeDrafts) {
      where.status = ProductStatus.PUBLISHED;
    } else {
      // In authenticated Real Fleet Admin Preview, display real imported models and exclude legacy demos
      where.status = { in: [ProductStatus.PUBLISHED, ProductStatus.DRAFT] };
      where.slug = { notIn: ProductsService.LEGACY_DEMO_SLUGS };
    }

    if (query?.category) {
      const catEnum = this.mapCategoryEnum(query.category);
      if (catEnum) {
        where.category = catEnum;
      }
    }

    if (query?.featured === true) {
      where.isFeatured = true;
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: [
        // In preview mode, list draft real models first
        ...(includeDrafts ? [{ status: 'asc' as const }] : []),
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
      take: query?.limit ? Number(query.limit) : undefined,
    });

    return products.map((p) => this.formatProduct(p, includeDrafts));
  }

  async getPublishedProductBySlug(slugOrId: string, preview: boolean = false) {
    const where: any = {
      OR: [
        { slug: slugOrId.toLowerCase() },
        { id: slugOrId },
        { evBike: { modelCode: slugOrId.toUpperCase() } },
        { slugAliases: { has: slugOrId.toLowerCase() } },
      ],
    };

    if (!preview) {
      where.status = ProductStatus.PUBLISHED;
    }

    const product = await this.prisma.product.findFirst({
      where,
    });

    if (!product) {
      throw new NotFoundException(`Product '${slugOrId}' not found${preview ? '' : ' or is not published'}`);
    }

    return this.formatProduct(product, preview);
  }

  async getPublishedByCategory(categoryStr: string, includeDrafts: boolean = false) {
    const catEnum = this.mapCategoryEnum(categoryStr);
    if (!catEnum) {
      throw new BadRequestException(`Invalid vehicle category: '${categoryStr}'`);
    }

    const where: any = {
      category: catEnum,
    };

    if (!includeDrafts) {
      where.status = ProductStatus.PUBLISHED;
    } else {
      // In authenticated Real Fleet Admin Preview, exclude legacy demos
      where.status = { in: [ProductStatus.PUBLISHED, ProductStatus.DRAFT] };
      where.slug = { notIn: ProductsService.LEGACY_DEMO_SLUGS };
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: [
        ...(includeDrafts ? [{ status: 'asc' as const }] : []),
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return products.map((p) => this.formatProduct(p, includeDrafts));
  }

  async getHeroSlides(includeDrafts: boolean = false) {
    if (!includeDrafts) {
      const products = await this.prisma.product.findMany({
        where: {
          status: ProductStatus.PUBLISHED,
          OR: [{ isHero: true }, { isFeatured: true }],
        },
        orderBy: [{ heroSlideOrder: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
      });

      return products.map((p) => this.formatProduct(p, false));
    }

    // In Real Fleet Preview mode, strictly showcase the real ASKR EV vehicle fleet
    // and completely exclude all 9 legacy demo products
    const realFleetHeroes = await this.prisma.product.findMany({
      where: {
        status: { in: [ProductStatus.PUBLISHED, ProductStatus.DRAFT] },
        slug: { notIn: ProductsService.LEGACY_DEMO_SLUGS },
        OR: [{ isHero: true }, { isFeatured: true }],
      },
      orderBy: [{ heroSlideOrder: 'asc' }, { displayOrder: 'asc' }, { createdAt: 'desc' }],
    });

    const realDraftModels = await this.prisma.product.findMany({
      where: {
        status: { in: [ProductStatus.PUBLISHED, ProductStatus.DRAFT] },
        slug: { notIn: ProductsService.LEGACY_DEMO_SLUGS },
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      take: 12,
    });

    const seenIds = new Set<string>();
    const combined: any[] = [];
    for (const p of [...realFleetHeroes, ...realDraftModels]) {
      if (!seenIds.has(p.id)) {
        seenIds.add(p.id);
        combined.push(p);
      }
    }

    return combined.map((p) => this.formatProduct(p, true));
  }

  // ===========================================================================
  // ADMIN DASHBOARD CATALOG MANAGEMENT METHODS
  // ===========================================================================

  async getAllProductsAdmin(query?: AdminProductQueryDto) {
    const page = Math.max(1, Number(query?.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query?.limit) || 50));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query?.category && query.category !== 'ALL') {
      const catEnum = this.mapCategoryEnum(query.category);
      if (catEnum) where.category = catEnum;
    }

    if (query?.status && query.status !== 'ALL') {
      where.status = query.status.toUpperCase();
    }

    if (query?.search && query.search.trim().length > 0) {
      const s = query.search.trim();
      where.OR = [
        { name: { contains: s, mode: 'insensitive' } },
        { slug: { contains: s, mode: 'insensitive' } },
        { brand: { contains: s, mode: 'insensitive' } },
        { tagline: { contains: s, mode: 'insensitive' } },
      ];
    }

    const [items, total, countPublished, countDraft, countArchived] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: [{ displayOrder: 'asc' }, { updatedAt: 'desc' }],
        skip,
        take: limit,
      }),
      this.prisma.product.count({ where }),
      this.prisma.product.count({ where: { status: ProductStatus.PUBLISHED } }),
      this.prisma.product.count({ where: { status: ProductStatus.DRAFT } }),
      this.prisma.product.count({ where: { status: ProductStatus.ARCHIVED } }),
    ]);

    return {
      items: items.map((p) => this.formatProduct(p, true)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      stats: {
        total: countPublished + countDraft + countArchived,
        published: countPublished,
        draft: countDraft,
        archived: countArchived,
      },
    };
  }

  async getProductByIdAdmin(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    return this.formatProduct(product, true);
  }

  async createProduct(dto: CreateProductDto, actorId?: string) {
    const slug = dto.slug ? await this.generateUniqueSlug(dto.slug) : await this.generateUniqueSlug(dto.name);

    const parsePaise = (paiseVal: any, inrVal: any) => {
      if (paiseVal !== undefined && paiseVal !== null && paiseVal !== '') {
        return BigInt(paiseVal);
      }
      if (inrVal !== undefined && inrVal !== null && inrVal !== '') {
        return BigInt(Math.round(Number(inrVal) * 100));
      }
      return null;
    };

    const regularPaise = parsePaise(dto.regularPricePaise, dto.regularPriceINR);
    const sellingPaise = parsePaise(dto.sellingPricePaise, dto.sellingPriceINR);
    const bookingPaise = parsePaise(dto.bookingAmountPaise, dto.bookingAmountINR);
    const voucherPaise = parsePaise(dto.voucherRedeemLimitPaise, dto.voucherRedeemLimitINR);

    // Highest display order + 1 if not specified
    let displayOrder = dto.displayOrder;
    if (displayOrder === undefined || displayOrder === null) {
      const highest = await this.prisma.product.findFirst({
        orderBy: { displayOrder: 'desc' },
      });
      displayOrder = (highest?.displayOrder || 0) + 1;
    }

    const product = await this.prisma.product.create({
      data: {
        name: dto.name,
        slug,
        category: dto.category as any,
        brand: dto.brand || 'ASKR EV',
        tagline: dto.tagline || '',
        shortDescription: dto.shortDescription || dto.tagline || '',
        fullDescription: dto.fullDescription || '',
        regularPricePaise: regularPaise,
        sellingPricePaise: sellingPaise,
        bookingAmountPaise: bookingPaise,
        voucherRedeemLimitPaise: voucherPaise,
        rangeKm: dto.rangeKm,
        topSpeedKmh: dto.topSpeedKmh,
        batteryCapacityKwh: dto.batteryCapacityKwh,
        chargingTimeHours: dto.chargingTimeHours,
        motorPower: dto.motorPower,
        acceleration: dto.acceleration,
        warranty: dto.warranty,
        powertrain: dto.powertrain,
        colors: dto.colors ? (dto.colors as any) : [],
        specifications: dto.specifications ? (dto.specifications as any) : [],
        highlights: dto.highlights ? (dto.highlights as any) : [],
        images: dto.images ? (dto.images as any) : [],
        heroImage: dto.heroImage || (dto.images && dto.images[0] ? dto.images[0].url : ''),
        thumbnailImage: dto.thumbnailImage || (dto.images && dto.images[0] ? dto.images[0].url : ''),
        isHero: dto.isHero || false,
        heroMobileImage: dto.heroMobileImage || null,
        heroHeading: dto.heroHeading || null,
        heroDescription: dto.heroDescription || null,
        heroCtaText: dto.heroCtaText || null,
        heroCtaLink: dto.heroCtaLink || null,
        heroSlideOrder: dto.heroSlideOrder ?? null,
        isFeatured: dto.isFeatured || false,
        status: (dto.status as any) || ProductStatus.DRAFT,
        displayOrder,
        evBikeId: dto.evBikeId || null,
        oemManufacturer: dto.oemManufacturer || null,
        oemModelName: dto.oemModelName || null,
        oemReference: dto.oemReference || null,
        internalNotes: dto.internalNotes || null,
        slugAliases: dto.slugAliases || [],
        isRebranded: dto.isRebranded ?? true,
      },
    });

    this.logger.log(`Created product '${product.name}' (ID: ${product.id}, Slug: ${product.slug})`);

    // Audit Log
    await this.recordAuditLog(actorId, 'PRODUCT_CREATE', product.id, {
      name: product.name,
      slug: product.slug,
      category: product.category,
      status: product.status,
    });

    return this.formatProduct(product, true);
  }

  async updateProduct(id: string, dto: UpdateProductDto, actorId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    const data: any = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.slug !== undefined && dto.slug !== existing.slug) {
      data.slug = await this.generateUniqueSlug(dto.slug, id);
    }
    if (dto.category !== undefined) data.category = dto.category;
    if (dto.brand !== undefined) data.brand = dto.brand;
    if (dto.tagline !== undefined) data.tagline = dto.tagline;
    if (dto.shortDescription !== undefined) data.shortDescription = dto.shortDescription;
    if (dto.fullDescription !== undefined) data.fullDescription = dto.fullDescription;

    const parsePaise = (paiseVal: any, inrVal: any) => {
      if (paiseVal !== undefined && paiseVal !== null && paiseVal !== '') {
        return BigInt(paiseVal);
      }
      if (inrVal !== undefined && inrVal !== null && inrVal !== '') {
        return BigInt(Math.round(Number(inrVal) * 100));
      }
      return null;
    };

    if (dto.regularPricePaise !== undefined || dto.regularPriceINR !== undefined) {
      data.regularPricePaise = parsePaise(dto.regularPricePaise, dto.regularPriceINR);
    }
    if (dto.sellingPricePaise !== undefined || dto.sellingPriceINR !== undefined) {
      data.sellingPricePaise = parsePaise(dto.sellingPricePaise, dto.sellingPriceINR);
    }
    if (dto.bookingAmountPaise !== undefined || dto.bookingAmountINR !== undefined) {
      data.bookingAmountPaise = parsePaise(dto.bookingAmountPaise, dto.bookingAmountINR);
    }
    if (dto.voucherRedeemLimitPaise !== undefined || dto.voucherRedeemLimitINR !== undefined) {
      data.voucherRedeemLimitPaise = parsePaise(dto.voucherRedeemLimitPaise, dto.voucherRedeemLimitINR);
    }

    if (dto.rangeKm !== undefined) data.rangeKm = dto.rangeKm;
    if (dto.topSpeedKmh !== undefined) data.topSpeedKmh = dto.topSpeedKmh;
    if (dto.batteryCapacityKwh !== undefined) data.batteryCapacityKwh = dto.batteryCapacityKwh;
    if (dto.chargingTimeHours !== undefined) data.chargingTimeHours = dto.chargingTimeHours;
    if (dto.motorPower !== undefined) data.motorPower = dto.motorPower;
    if (dto.acceleration !== undefined) data.acceleration = dto.acceleration;
    if (dto.warranty !== undefined) data.warranty = dto.warranty;
    if (dto.powertrain !== undefined) data.powertrain = dto.powertrain;

    if (dto.colors !== undefined) data.colors = dto.colors;
    if (dto.specifications !== undefined) data.specifications = dto.specifications;
    if (dto.highlights !== undefined) data.highlights = dto.highlights;
    if (dto.images !== undefined) data.images = dto.images;
    if (dto.heroImage !== undefined) data.heroImage = dto.heroImage;
    if (dto.thumbnailImage !== undefined) data.thumbnailImage = dto.thumbnailImage;
    if (dto.isHero !== undefined) data.isHero = dto.isHero;
    if (dto.heroMobileImage !== undefined) data.heroMobileImage = dto.heroMobileImage;
    if (dto.heroHeading !== undefined) data.heroHeading = dto.heroHeading;
    if (dto.heroDescription !== undefined) data.heroDescription = dto.heroDescription;
    if (dto.heroCtaText !== undefined) data.heroCtaText = dto.heroCtaText;
    if (dto.heroCtaLink !== undefined) data.heroCtaLink = dto.heroCtaLink;
    if (dto.heroSlideOrder !== undefined) data.heroSlideOrder = dto.heroSlideOrder;
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.evBikeId !== undefined) data.evBikeId = dto.evBikeId;
    if (dto.oemManufacturer !== undefined) data.oemManufacturer = dto.oemManufacturer;
    if (dto.oemModelName !== undefined) data.oemModelName = dto.oemModelName;
    if (dto.oemReference !== undefined) data.oemReference = dto.oemReference;
    if (dto.internalNotes !== undefined) data.internalNotes = dto.internalNotes;
    if (dto.slugAliases !== undefined) data.slugAliases = dto.slugAliases;
    if (dto.isRebranded !== undefined) data.isRebranded = dto.isRebranded;

    const updated = await this.prisma.product.update({
      where: { id },
      data,
    });

    this.logger.log(`Updated product '${updated.name}' (ID: ${updated.id})`);

    await this.recordAuditLog(actorId, 'PRODUCT_UPDATE', updated.id, {
      changes: Object.keys(data),
      name: updated.name,
      status: updated.status,
    });

    return this.formatProduct(updated, true);
  }

  async updateStatus(id: string, status: ProductStatus, actorId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { status },
    });

    await this.recordAuditLog(actorId, 'PRODUCT_STATUS_CHANGE', updated.id, {
      oldStatus: existing.status,
      newStatus: status,
    });

    return this.formatProduct(updated, true);
  }

  async toggleFeatured(id: string, actorId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { isFeatured: !existing.isFeatured },
    });

    await this.recordAuditLog(actorId, 'PRODUCT_FEATURED_TOGGLE', updated.id, {
      isFeatured: updated.isFeatured,
    });

    return this.formatProduct(updated, true);
  }

  async toggleHero(id: string, actorId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { isHero: !existing.isHero },
    });

    await this.recordAuditLog(actorId, 'PRODUCT_HERO_TOGGLE', updated.id, {
      isHero: updated.isHero,
    });

    return this.formatProduct(updated, true);
  }

  async reorderProducts(items: { id: string; displayOrder: number }[], actorId?: string) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new BadRequestException('Reorder list cannot be empty');
    }

    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.product.update({
          where: { id: item.id },
          data: { displayOrder: Number(item.displayOrder) },
        })
      )
    );

    await this.recordAuditLog(actorId, 'PRODUCT_REORDER', null, {
      reorderedCount: items.length,
    });

    return { success: true, count: items.length };
  }

  async deleteProduct(id: string, permanent: boolean = false, actorId?: string) {
    const existing = await this.prisma.product.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Product with ID '${id}' not found`);
    }

    if (permanent) {
      await this.prisma.product.delete({ where: { id } });
      await this.recordAuditLog(actorId, 'PRODUCT_DELETE_PERMANENT', id, { name: existing.name });
      return { success: true, permanent: true, deletedId: id };
    }

    // Default: Safe archive
    const archived = await this.prisma.product.update({
      where: { id },
      data: { status: ProductStatus.ARCHIVED },
    });

    await this.recordAuditLog(actorId, 'PRODUCT_ARCHIVE', id, { name: existing.name });
    return { success: true, permanent: false, product: this.formatProduct(archived) };
  }

  private async recordAuditLog(actorId: string | undefined, action: string, entityId: string | null, metadata: any) {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: actorId || null,
          action,
          entityType: 'PRODUCT',
          entityId,
          metadata: metadata || {},
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not create audit log: ${e.message}`);
    }
  }
}

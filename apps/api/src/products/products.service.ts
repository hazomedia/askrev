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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper: Formats a Prisma Product entity for API response.
   * Converts integer paise BigInt fields into INR rupees numbers.
   */
  private formatProduct(p: any) {
    if (!p) return null;

    const sellingINR = p.sellingPricePaise ? paiseToRupees(p.sellingPricePaise) : null;
    const regularINR = p.regularPricePaise ? paiseToRupees(p.regularPricePaise) : null;
    const bookingINR = p.bookingAmountPaise ? paiseToRupees(p.bookingAmountPaise) : null;
    const heroImg = p.heroImage || (p.images && p.images[0] ? p.images[0].url : '');

    return {
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
      colors: p.colors || [],
      specifications: p.specifications || [],
      specs: p.specifications || [],
      highlights: p.highlights || [],
      images: p.images || [],
      heroImage: heroImg,
      imageUrl: heroImg,
      thumbnailImage: p.thumbnailImage || heroImg,
      isBookable: Boolean(p.bookingAmountPaise && BigInt(p.bookingAmountPaise) > 0n),
      statusBadge: p.bookingAmountPaise && BigInt(p.bookingAmountPaise) > 0n ? 'Bookings Open' : 'Showroom Showcase',
      isFeatured: p.isFeatured,
      status: p.status,
      displayOrder: p.displayOrder,
      evBikeId: p.evBikeId,
      createdAt: p.createdAt ? p.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: p.updatedAt ? p.updatedAt.toISOString() : new Date().toISOString(),
    };
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

  async getPublishedCatalog(query?: PublicCatalogQueryDto) {
    const where: any = {
      status: ProductStatus.PUBLISHED,
    };

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
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
      take: query?.limit ? Number(query.limit) : undefined,
    });

    return products.map((p) => this.formatProduct(p));
  }

  async getPublishedProductBySlug(slugOrId: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        OR: [
          { slug: slugOrId.toLowerCase() },
          { id: slugOrId },
          { evBike: { modelCode: slugOrId.toUpperCase() } },
        ],
        status: ProductStatus.PUBLISHED,
      },
    });

    if (!product) {
      throw new NotFoundException(`Product '${slugOrId}' not found or is not published`);
    }

    return this.formatProduct(product);
  }

  async getPublishedByCategory(categoryStr: string) {
    const catEnum = this.mapCategoryEnum(categoryStr);
    if (!catEnum) {
      throw new BadRequestException(`Invalid vehicle category: '${categoryStr}'`);
    }

    const products = await this.prisma.product.findMany({
      where: {
        category: catEnum,
        status: ProductStatus.PUBLISHED,
      },
      orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
    });

    return products.map((p) => this.formatProduct(p));
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
      items: items.map((p) => this.formatProduct(p)),
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

    return this.formatProduct(product);
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
        isFeatured: dto.isFeatured || false,
        status: (dto.status as any) || ProductStatus.DRAFT,
        displayOrder,
        evBikeId: dto.evBikeId || null,
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

    return this.formatProduct(product);
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
    if (dto.isFeatured !== undefined) data.isFeatured = dto.isFeatured;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.displayOrder !== undefined) data.displayOrder = dto.displayOrder;
    if (dto.evBikeId !== undefined) data.evBikeId = dto.evBikeId;

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

    return this.formatProduct(updated);
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

    return this.formatProduct(updated);
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

    return this.formatProduct(updated);
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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductsService } from './products.service';
import { ProductCategory, ProductStatus } from '@askrev/shared';

describe('ProductsService', () => {
  let service: ProductsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      product: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((ops) => Promise.all(ops)),
    };

    service = new ProductsService(prismaMock);
  });

  it('should return published catalog products converted to INR', async () => {
    prismaMock.product.findMany.mockResolvedValue([
      {
        id: 'prod-1',
        name: 'ASKR S1 Pro',
        slug: 'scooter-s1-pro',
        category: ProductCategory.SCOOTER,
        brand: 'ASKR EV',
        regularPricePaise: 14750000n,
        sellingPricePaise: 12999900n,
        bookingAmountPaise: 499900n,
        voucherRedeemLimitPaise: null,
        rangeKm: 195,
        topSpeedKmh: 120,
        isFeatured: true,
        status: ProductStatus.PUBLISHED,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const result = await service.getPublishedCatalog();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('ASKR S1 Pro');
    expect(result[0].sellingPriceINR).toBe(129999);
    expect(result[0].regularPriceINR).toBe(147500);
    expect(result[0].bookingAmountINR).toBe(4999);
    expect(result[0].categoryLabel).toBe('Electric Scooter');
  });

  it('should throw NotFoundException if product is not found or not published', async () => {
    prismaMock.product.findFirst.mockResolvedValue(null);

    await expect(service.getPublishedProductBySlug('non-existent')).rejects.toThrow();
  });

  it('should create a new product with unique slug and integer paise conversion', async () => {
    prismaMock.product.findUnique.mockResolvedValue(null);
    prismaMock.product.findFirst.mockResolvedValue({ displayOrder: 5 });
    prismaMock.product.create.mockImplementation(({ data }: any) =>
      Promise.resolve({
        id: 'new-prod-id',
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    );

    const result = await service.createProduct(
      {
        name: 'ASKR UltraBike',
        category: ProductCategory.BIKE,
        sellingPriceINR: 150000,
        bookingAmountINR: 5000,
        rangeKm: 200,
        topSpeedKmh: 130,
      },
      'ASKR-ADMIN-01'
    );

    expect(result.name).toBe('ASKR UltraBike');
    expect(result.slug).toBe('askr-ultrabike');
    expect(result.sellingPriceINR).toBe(150000);
    expect(result.displayOrder).toBe(6);
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });

  it('should toggle featured status of an existing product', async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: 'p-1',
      name: 'ASKR S1 Pro',
      isFeatured: false,
    });
    prismaMock.product.update.mockResolvedValue({
      id: 'p-1',
      name: 'ASKR S1 Pro',
      category: ProductCategory.SCOOTER,
      isFeatured: true,
      status: ProductStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.toggleFeatured('p-1', 'ASKR-ADMIN-01');
    expect(result.isFeatured).toBe(true);
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 'p-1' },
      data: { isFeatured: true },
    });
  });

  it('should batch reorder products in transaction', async () => {
    prismaMock.product.update.mockResolvedValue({});

    const result = await service.reorderProducts(
      [
        { id: 'p-1', displayOrder: 1 },
        { id: 'p-2', displayOrder: 2 },
      ],
      'ASKR-ADMIN-01'
    );

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(prismaMock.$transaction).toHaveBeenCalled();
  });

  it('should bulk archive products and create audit logs', async () => {
    prismaMock.product.updateMany = vi.fn().mockResolvedValue({ count: 2 });
    prismaMock.auditLog.create = vi.fn().mockResolvedValue({});

    const result = await service.bulkArchive(['p-1', 'p-2'], 'ADMIN-USER-1');
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);
    expect(prismaMock.product.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['p-1', 'p-2'] } },
      data: { status: ProductStatus.ARCHIVED },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });

  it('should restore an archived product back to DRAFT', async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: 'p-archived',
      name: 'Archived Bike',
      status: ProductStatus.ARCHIVED,
      category: ProductCategory.BIKE,
    });
    prismaMock.product.update.mockResolvedValue({
      id: 'p-archived',
      name: 'Archived Bike',
      status: ProductStatus.DRAFT,
      category: ProductCategory.BIKE,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.restoreProduct('p-archived', 'ADMIN-USER-1');
    expect(result.success).toBe(true);
    expect(result.product.status).toBe(ProductStatus.DRAFT);
    expect(prismaMock.product.update).toHaveBeenCalledWith({
      where: { id: 'p-archived' },
      data: { status: ProductStatus.DRAFT },
    });
    expect(prismaMock.auditLog.create).toHaveBeenCalled();
  });

  it('should block deletion if product is bound to hero slides', async () => {
    prismaMock.product.findUnique.mockResolvedValue({
      id: 'p-hero',
      name: 'Hero Scooter',
      evBikeId: null,
    });
    prismaMock.homepageHeroSlide = {
      count: vi.fn().mockResolvedValue(1),
    };

    await expect(service.deleteProduct('p-hero', true, 'ADMIN-USER-1')).rejects.toThrow(
      /Cannot permanently delete product/
    );
  });
});


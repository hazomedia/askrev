import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { MediaService } from './media.service';
import { Readable } from 'stream';

describe('MediaService', () => {
  let mediaService: MediaService;
  let mockPrisma: any;
  let mockJwtService: any;
  let mockStorageService: any;

  beforeEach(() => {
    mockPrisma = {
      homepageHeroSlide: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      product: {
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
      dashboardTopBanner: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
      popupCampaign: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };

    mockJwtService = {
      verify: vi.fn(),
    };

    mockStorageService = {
      isConfigured: vi.fn().mockReturnValue(true),
      getBucketName: vi.fn().mockReturnValue('askrev-media'),
      getS3Client: vi.fn().mockReturnValue(null),
    };

    mediaService = new MediaService(mockPrisma, mockJwtService, mockStorageService);
  });

  describe('Path traversal & validation', () => {
    it('should reject paths with directory traversal', async () => {
      const mockReq: any = { headers: {} };
      const mockRes: any = {};

      await expect(
        mediaService.streamMedia('../../etc/passwd', mockReq, mockRes)
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject paths with backslashes or null bytes', async () => {
      const mockReq: any = { headers: {} };
      const mockRes: any = {};

      await expect(
        mediaService.streamMedia('hero\\desktop\\image.jpg', mockReq, mockRes)
      ).rejects.toThrow(BadRequestException);

      await expect(
        mediaService.streamMedia('hero/desktop/\0image.jpg', mockReq, mockRes)
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('Access Control for Media Content', () => {
    it('should identify published hero slides as public', async () => {
      mockPrisma.homepageHeroSlide.findFirst.mockResolvedValue({
        id: 'slide-1',
        status: 'PUBLISHED',
        desktopImageUrl: '/api/media/hero/desktop/valid-hero.webp',
      });

      const isPublished = await mediaService.isMediaAttachedToPublishedContent('hero/desktop/valid-hero.webp');
      expect(isPublished).toBe(true);
    });

    it('should identify draft content as non-public', async () => {
      mockPrisma.homepageHeroSlide.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const isPublished = await mediaService.isMediaAttachedToPublishedContent('hero/desktop/draft-slide.webp');
      expect(isPublished).toBe(false);
    });

    it('should identify published product gallery images as public', async () => {
      mockPrisma.homepageHeroSlide.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          status: 'PUBLISHED',
          images: [{ url: '/api/media/vehicles/s01/gallery/photo1.webp', isPrimary: true }],
          colors: [],
        },
      ]);

      const isPublished = await mediaService.isMediaAttachedToPublishedContent('vehicles/s01/gallery/photo1.webp');
      expect(isPublished).toBe(true);
    });

    it('should identify published product variant colors as public', async () => {
      mockPrisma.homepageHeroSlide.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([
        {
          id: 'prod-1',
          status: 'PUBLISHED',
          images: [],
          colors: [
            {
              name: 'Racing Blue',
              primaryImage: '/api/media/vehicles/b01/variants/blue.webp',
            },
          ],
        },
      ]);

      const isPublished = await mediaService.isMediaAttachedToPublishedContent('vehicles/b01/variants/blue.webp');
      expect(isPublished).toBe(true);
    });

    it('should deny anonymous access to draft media with ForbiddenException', async () => {
      mockPrisma.homepageHeroSlide.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);

      const mockReq: any = {
        headers: {},
        cookies: {},
        url: '/api/media/vehicles/secret/gallery/draft.webp',
      };
      const mockRes: any = {};

      await expect(
        mediaService.streamMedia('vehicles/secret/gallery/draft.webp', mockReq, mockRes)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should allow admin access to draft media', async () => {
      mockPrisma.homepageHeroSlide.findFirst.mockResolvedValue(null);
      mockPrisma.product.findFirst.mockResolvedValue(null);
      mockPrisma.product.findMany.mockResolvedValue([]);

      mockJwtService.verify.mockReturnValue({
        sub: 'admin-user-id',
        role: 'SUPER_ADMIN',
      });

      const mockReq: any = {
        headers: { authorization: 'Bearer valid-admin-jwt' },
        cookies: {},
        url: '/api/media/vehicles/test/gallery/draft.webp',
      };

      // Since R2 client is null in this unit test and local file doesn't exist, it should reach NotFoundException rather than ForbiddenException
      await expect(
        mediaService.streamMedia('vehicles/test/gallery/draft.webp', mockReq, {} as any)
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('Conditional GET (ETag Caching)', () => {
    it('should return 304 Not Modified when If-None-Match matches ETag', async () => {
      // Mock s3Client with send
      const mockS3 = {
        send: vi.fn().mockResolvedValue({
          ContentType: 'image/webp',
          ETag: '"etag-12345"',
          ContentLength: 54321,
          Body: new Readable({ read() { this.push(null); } }),
        }),
      };

      (mediaService as any).s3Client = mockS3;
      (mediaService as any).isR2Configured = true;

      // Mock media as published
      mockPrisma.homepageHeroSlide.findFirst.mockResolvedValue({
        id: 'slide-1',
        status: 'PUBLISHED',
        desktopImageUrl: '/api/media/hero/desktop/etag-test.webp',
      });

      let ended = false;
      let statusCode = 200;
      const mockRes: any = {
        setHeader: vi.fn(),
        status: vi.fn().mockImplementation((code) => {
          statusCode = code;
          return {
            end: () => { ended = true; },
          };
        }),
      };

      const mockReq: any = {
        headers: {
          'if-none-match': '"etag-12345"',
        },
      };

      await mediaService.streamMedia('hero/desktop/etag-test.webp', mockReq, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(304);
      expect(ended).toBe(true);
    });
  });
});

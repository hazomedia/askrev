import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BannersService } from './banners.service';
import { BannerStatus, PopupFrequency } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('BannersService', () => {
  let service: BannersService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      $transaction: vi.fn((ops) => Promise.all(ops)),
      dashboardTopBanner: {
        count: vi.fn(),
        create: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      popupCampaign: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      popupDismissal: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
      },
    };

    service = new BannersService(prismaMock);
  });

  describe('seedDefaults', () => {
    it('should seed default top banner and welcome popup if none exist', async () => {
      prismaMock.dashboardTopBanner.count.mockResolvedValue(0);
      prismaMock.dashboardTopBanner.create.mockResolvedValue({ id: 'top-1' });
      prismaMock.popupCampaign.findFirst.mockResolvedValue(null);
      prismaMock.popupCampaign.create.mockResolvedValue({ id: 'popup-1', name: 'ASKR EV Welcome' });

      await service.seedDefaults();

      expect(prismaMock.dashboardTopBanner.create).toHaveBeenCalled();
      expect(prismaMock.popupCampaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'ASKR EV Welcome',
            heading: 'WELCOME TO ASKR EV',
            frequency: PopupFrequency.EVERY_VISIT,
            status: BannerStatus.PUBLISHED,
          }),
        })
      );
    });

    it('should be idempotent and update existing welcome campaign to EVERY_VISIT if needed', async () => {
      prismaMock.dashboardTopBanner.count.mockResolvedValue(1);
      prismaMock.popupCampaign.findFirst.mockResolvedValue({
        id: 'existing-welcome',
        frequency: PopupFrequency.ONCE_PER_CAMPAIGN,
      });
      prismaMock.popupCampaign.update.mockResolvedValue({
        id: 'existing-welcome',
        frequency: PopupFrequency.EVERY_VISIT,
      });

      await service.seedDefaults();

      expect(prismaMock.dashboardTopBanner.create).not.toHaveBeenCalled();
      expect(prismaMock.popupCampaign.create).not.toHaveBeenCalled();
      expect(prismaMock.popupCampaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'existing-welcome' },
          data: { frequency: PopupFrequency.EVERY_VISIT },
        })
      );
    });
  });

  describe('computeCampaignStatus', () => {
    it('should return DRAFT if status is DRAFT', () => {
      const status = service.computeCampaignStatus({
        status: BannerStatus.DRAFT,
        startDate: null,
        endDate: null,
      });
      expect(status).toBe('DRAFT');
    });

    it('should return DISABLED if status is DISABLED', () => {
      const status = service.computeCampaignStatus({
        status: BannerStatus.DISABLED,
        startDate: null,
        endDate: null,
      });
      expect(status).toBe('DISABLED');
    });

    it('should return SCHEDULED if published with future start date', () => {
      const future = new Date(Date.now() + 86400000);
      const status = service.computeCampaignStatus({
        status: BannerStatus.PUBLISHED,
        startDate: future,
        endDate: null,
      });
      expect(status).toBe('SCHEDULED');
    });

    it('should return EXPIRED if published with past end date', () => {
      const past = new Date(Date.now() - 86400000);
      const status = service.computeCampaignStatus({
        status: BannerStatus.PUBLISHED,
        startDate: null,
        endDate: past,
      });
      expect(status).toBe('EXPIRED');
    });

    it('should return ACTIVE if published within schedule window', () => {
      const past = new Date(Date.now() - 86400000);
      const future = new Date(Date.now() + 86400000);
      const status = service.computeCampaignStatus({
        status: BannerStatus.PUBLISHED,
        startDate: past,
        endDate: future,
      });
      expect(status).toBe('ACTIVE');
    });
  });

  describe('getActiveBanners', () => {
    it('should return top banner and active popup campaign for eligible user', async () => {
      prismaMock.dashboardTopBanner.findMany.mockResolvedValue([
        {
          id: 'top-1',
          desktopImageUrl: '/test.webp',
          isEnabled: true,
          status: BannerStatus.PUBLISHED,
          startDate: null,
          endDate: null,
          displayOrder: 0,
        },
      ]);

      prismaMock.popupCampaign.findMany.mockResolvedValue([
        {
          id: 'popup-1',
          name: 'ASKR EV Welcome',
          heading: 'WELCOME TO ASKR EV',
          frequency: PopupFrequency.ONCE_PER_CAMPAIGN,
          status: BannerStatus.PUBLISHED,
          startDate: null,
          endDate: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      prismaMock.popupDismissal.findUnique.mockResolvedValue(null);

      const result = await service.getActiveBanners('user-1');

      expect(result.topBanner).toBeDefined();
      expect(result.popupCampaign).toBeDefined();
      expect(result.popupCampaign?.heading).toBe('WELCOME TO ASKR EV');
    });

    it('should NOT return popup if user already dismissed ONCE_PER_CAMPAIGN popup', async () => {
      prismaMock.dashboardTopBanner.findFirst.mockResolvedValue({ id: 'top-1' });

      prismaMock.popupCampaign.findMany.mockResolvedValue([
        {
          id: 'popup-1',
          frequency: PopupFrequency.ONCE_PER_CAMPAIGN,
          status: BannerStatus.PUBLISHED,
          startDate: null,
          endDate: null,
          updatedAt: new Date(),
        },
      ]);

      prismaMock.popupDismissal.findUnique.mockResolvedValue({
        campaignId: 'popup-1',
        userId: 'user-1',
        dismissedAt: new Date(),
      });

      const result = await service.getActiveBanners('user-1');
      expect(result.popupCampaign).toBeNull();
    });

    it('should return popup for ONCE_DAILY frequency if dismissed on a prior day', async () => {
      prismaMock.dashboardTopBanner.findFirst.mockResolvedValue({ id: 'top-1' });

      prismaMock.popupCampaign.findMany.mockResolvedValue([
        {
          id: 'popup-daily',
          frequency: PopupFrequency.ONCE_DAILY,
          status: BannerStatus.PUBLISHED,
          startDate: null,
          endDate: null,
          updatedAt: new Date(),
        },
      ]);

      prismaMock.popupDismissal.findUnique.mockResolvedValue({
        campaignId: 'popup-daily',
        userId: 'user-1',
        lastSeenDate: '2026-11-20', // older date in past
      });

      const result = await service.getActiveBanners('user-1');
      expect(result.popupCampaign).toBeDefined();
      expect(result.popupCampaign?.id).toBe('popup-daily');
    });
  });

  describe('recordDismissal', () => {
    it('should upsert dismissal record with current IST date', async () => {
      prismaMock.popupCampaign.findUnique.mockResolvedValue({ id: 'popup-1' });
      prismaMock.popupDismissal.upsert.mockResolvedValue({
        id: 'dismissal-1',
        campaignId: 'popup-1',
        userId: 'user-1',
        dismissedAt: new Date(),
      });

      const result = await service.recordDismissal('popup-1', 'user-1');
      expect(result.success).toBe(true);
      expect(prismaMock.popupDismissal.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            campaignId_userId: {
              campaignId: 'popup-1',
              userId: 'user-1',
            },
          },
        })
      );
    });

    it('should throw NotFoundException if campaign does not exist', async () => {
      prismaMock.popupCampaign.findUnique.mockResolvedValue(null);
      await expect(service.recordDismissal('invalid-id', 'user-1')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('createPopupCampaign', () => {
    it('should validate that endDate is after startDate', async () => {
      await expect(
        service.createPopupCampaign({
          name: 'Test',
          heading: 'Heading',
          message: 'Message',
          startDate: '2026-11-25T10:00:00Z',
          endDate: '2026-11-24T10:00:00Z', // Before startDate!
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should create campaign successfully with trimmed fields', async () => {
      prismaMock.popupCampaign.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'new-id', ...data })
      );

      const result = await service.createPopupCampaign(
        {
          name: ' Festive Launch ',
          heading: ' FESTIVE OFFERS ',
          message: ' Check out our festival deals ',
        },
        'admin-user-id'
      );

      expect(result.name).toBe('Festive Launch');
      expect(result.heading).toBe('FESTIVE OFFERS');
      expect(result.computedStatus).toBe('DRAFT');
    });
  });

  describe('Carousel Slides Management', () => {
    it('should create a slide with computed status and default displayOrder', async () => {
      prismaMock.dashboardTopBanner.findFirst.mockResolvedValue({ displayOrder: 2 });
      prismaMock.dashboardTopBanner.create.mockImplementation(({ data }: any) =>
        Promise.resolve({ id: 'slide-new', ...data, createdAt: new Date(), updatedAt: new Date() })
      );

      const result = await service.createSlide({
        title: 'New EV Model',
        desktopImageUrl: 'https://cdn.example.com/slide.webp',
      });

      expect(result.id).toBe('slide-new');
      expect(result.displayOrder).toBe(3);
      expect(result.computedStatus).toBe('ACTIVE');
      expect(prismaMock.dashboardTopBanner.create).toHaveBeenCalled();
    });

    it('should reorder slides in a database transaction', async () => {
      prismaMock.dashboardTopBanner.update.mockResolvedValue({ id: 's1' });
      prismaMock.dashboardTopBanner.findMany.mockResolvedValue([
        {
          id: 's2',
          displayOrder: 0,
          status: BannerStatus.PUBLISHED,
          isEnabled: true,
          startDate: null,
          endDate: null,
        },
        {
          id: 's1',
          displayOrder: 1,
          status: BannerStatus.PUBLISHED,
          isEnabled: true,
          startDate: null,
          endDate: null,
        },
      ]);

      const result = await service.reorderSlides(['s2', 's1']);
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('s2');
      expect(result[1].id).toBe('s1');
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Reflector } from '@nestjs/core';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { BannersAdminController } from './banners-admin.controller';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { UserRole } from '@askrev/shared';

describe('BannersAdminController - Authorization & Security', () => {
  let controller: BannersAdminController;
  let bannersServiceMock: any;
  let storageServiceMock: any;
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    bannersServiceMock = {
      getAdminTopBanner: vi.fn(),
      updateTopBanner: vi.fn(),
      getAdminSlides: vi.fn(),
      getAdminSlideById: vi.fn(),
      createSlide: vi.fn(),
      updateSlide: vi.fn(),
      publishSlide: vi.fn(),
      disableSlide: vi.fn(),
      deleteSlide: vi.fn(),
      reorderSlides: vi.fn(),
      getAdminPopupCampaigns: vi.fn(),
      getAdminPopupCampaignById: vi.fn(),
      createPopupCampaign: vi.fn(),
      updatePopupCampaign: vi.fn(),
      publishPopupCampaign: vi.fn(),
      disablePopupCampaign: vi.fn(),
      deletePopupCampaign: vi.fn(),
    };

    storageServiceMock = {
      uploadBannerImage: vi.fn(),
    };

    controller = new BannersAdminController(bannersServiceMock, storageServiceMock);
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  const createMockContext = (user?: { id?: string; role?: string }): ExecutionContext => {
    const mockRequest = { user };
    return {
      getHandler: () => () => {},
      getClass: () => BannersAdminController,
      switchToHttp: () => ({
        getRequest: () => mockRequest,
        getResponse: () => ({}),
      }),
    } as unknown as ExecutionContext;
  };

  describe('RBAC Roles Metadata Verification', () => {
    it('should strictly declare UserRole.SUPER_ADMIN as the only authorized role', () => {
      const roles = Reflect.getMetadata(ROLES_KEY, BannersAdminController);
      expect(roles).toBeDefined();
      expect(roles).toEqual([UserRole.SUPER_ADMIN]);
    });

    it('should NOT allow ADMIN_OPERATIONS in the controller roles metadata', () => {
      const roles: UserRole[] = Reflect.getMetadata(ROLES_KEY, BannersAdminController);
      expect(roles).not.toContain(UserRole.ADMIN_OPERATIONS);
    });

    it('should NOT allow FINANCE_MANAGER, MEMBER, or FREE_USER in the controller roles metadata', () => {
      const roles: UserRole[] = Reflect.getMetadata(ROLES_KEY, BannersAdminController);
      expect(roles).not.toContain(UserRole.FINANCE_MANAGER);
      expect(roles).not.toContain(UserRole.MEMBER);
      expect(roles).not.toContain(UserRole.FREE_USER);
    });
  });

  describe('RolesGuard Enforcement on BannersAdminController', () => {
    it('should permit SUPER_ADMIN access to banner management operations', () => {
      const context = createMockContext({ id: 'admin-1', role: UserRole.SUPER_ADMIN });
      const canActivate = rolesGuard.canActivate(context);
      expect(canActivate).toBe(true);
    });

    it('should deny ADMIN_OPERATIONS access with ForbiddenException', () => {
      const context = createMockContext({ id: 'ops-1', role: UserRole.ADMIN_OPERATIONS });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        'Access denied: insufficient administrative privileges'
      );
    });

    it('should deny FINANCE_MANAGER access with ForbiddenException', () => {
      const context = createMockContext({ id: 'fin-1', role: UserRole.FINANCE_MANAGER });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => rolesGuard.canActivate(context)).toThrow(
        'Access denied: insufficient administrative privileges'
      );
    });

    it('should deny MEMBER role access with ForbiddenException', () => {
      const context = createMockContext({ id: 'mem-1', role: UserRole.MEMBER });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny FREE_USER role access with ForbiddenException', () => {
      const context = createMockContext({ id: 'free-1', role: UserRole.FREE_USER });
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should deny unauthenticated requests (missing user object)', () => {
      const context = createMockContext(undefined);
      expect(() => rolesGuard.canActivate(context)).toThrow(ForbiddenException);
    });
  });

  describe('Controller Execution Delegation', () => {
    it('should delegate getTopBanner to bannersService', async () => {
      bannersServiceMock.getAdminTopBanner.mockResolvedValue({ id: 'banner-1' });
      const result = await controller.getTopBanner();
      expect(bannersServiceMock.getAdminTopBanner).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'banner-1' });
    });

    it('should delegate updateTopBanner to bannersService', async () => {
      const dto = { title: 'Updated' };
      bannersServiceMock.updateTopBanner.mockResolvedValue({ id: 'banner-1', title: 'Updated' });
      const result = await controller.updateTopBanner(dto as any);
      expect(bannersServiceMock.updateTopBanner).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'banner-1', title: 'Updated' });
    });

    it('should delegate getPopupCampaigns to bannersService', async () => {
      bannersServiceMock.getAdminPopupCampaigns.mockResolvedValue([]);
      const result = await controller.getPopupCampaigns();
      expect(bannersServiceMock.getAdminPopupCampaigns).toHaveBeenCalledTimes(1);
      expect(result).toEqual([]);
    });

    it('should delegate createPopupCampaign passing user id to bannersService', async () => {
      const dto = { name: 'Promo', heading: 'Welcome', message: 'Hello' } as any;
      const user = { id: 'admin-super-1' };
      bannersServiceMock.createPopupCampaign.mockResolvedValue({ id: 'popup-1', ...dto });
      const result = await controller.createPopupCampaign(dto, user);
      expect(bannersServiceMock.createPopupCampaign).toHaveBeenCalledWith(dto, 'admin-super-1');
      expect(result.id).toBe('popup-1');
    });

    it('should delegate publishPopupCampaign to bannersService', async () => {
      bannersServiceMock.publishPopupCampaign.mockResolvedValue({ id: 'p-1', status: 'PUBLISHED' });
      const result = await controller.publishPopupCampaign('p-1');
      expect(bannersServiceMock.publishPopupCampaign).toHaveBeenCalledWith('p-1');
      expect(result.status).toBe('PUBLISHED');
    });

    it('should delegate disablePopupCampaign to bannersService', async () => {
      bannersServiceMock.disablePopupCampaign.mockResolvedValue({ id: 'p-1', status: 'DISABLED' });
      const result = await controller.disablePopupCampaign('p-1');
      expect(bannersServiceMock.disablePopupCampaign).toHaveBeenCalledWith('p-1');
      expect(result.status).toBe('DISABLED');
    });

    it('should delegate deletePopupCampaign to bannersService', async () => {
      bannersServiceMock.deletePopupCampaign.mockResolvedValue({ success: true, id: 'p-1' });
      const result = await controller.deletePopupCampaign('p-1');
      expect(bannersServiceMock.deletePopupCampaign).toHaveBeenCalledWith('p-1');
      expect(result.success).toBe(true);
    });

    it('should delegate uploadBannerImage to storageService', async () => {
      const file = { buffer: Buffer.from('fake'), size: 100 } as any;
      storageServiceMock.uploadBannerImage.mockResolvedValue({ url: '/api/media/banners/top/1.webp' });
      const result = await controller.uploadBannerImage(file, 'top');
      expect(storageServiceMock.uploadBannerImage).toHaveBeenCalledWith(file, 'top');
      expect(result.url).toBe('/api/media/banners/top/1.webp');
    });
  });
});

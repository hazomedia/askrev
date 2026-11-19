import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Req,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ProductsService } from './products.service';
import { StorageService } from './storage.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { PublicCatalogQueryDto, AdminProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CsrfGuard } from '../auth/guards/csrf.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ProductStatus } from '@askrev/shared';
import { getJwtAccessSecret, getJwtRefreshSecret, isAccessTokenRevoked } from '../auth/jwt-secrets';

// =============================================================================
// 1. PUBLIC SHOWROOM CATALOG CONTROLLER (/api/catalog)
// =============================================================================
@Controller('catalog')
export class CatalogPublicController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Cryptographically verifies if the incoming request originates from an
   * authenticated administrator (SUPER_ADMIN or ADMIN).
   * Checks both HttpOnly session cookies and Authorization Bearer headers.
   */
  private async verifyAdminCaller(req: Request): Promise<boolean> {
    try {
      let token = '';
      const authHeader = req.headers?.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (req.cookies) {
        token = req.cookies['askrev_access_token'] || req.cookies['askrev_admin_session'] || '';
      }

      if (token && !isAccessTokenRevoked(token)) {
        try {
          const payload = await this.jwtService.verifyAsync(token, {
            secret: getJwtAccessSecret(),
          });

          if (payload && payload.sub) {
            const role = (payload.role || '').toUpperCase();
            if (
              role === UserRole.SUPER_ADMIN ||
              role === UserRole.ADMIN_OPERATIONS ||
              role === 'ADMIN'
            ) {
              return true;
            }
          }
        } catch {
          // Access token expired or invalid; proceed to check refresh token cookie fallback
        }
      }

      // Refresh Token Fallback: if access token has expired (15m window) but caller
      // holds a valid admin refresh token cookie (7d window), grant preview access
      const refreshToken = req.cookies?.['askrev_refresh_token'];
      if (refreshToken) {
        try {
          const refreshPayload = await this.jwtService.verifyAsync(refreshToken, {
            secret: getJwtRefreshSecret(),
          });
          if (refreshPayload && refreshPayload.sub) {
            const role = (refreshPayload.role || '').toUpperCase();
            return (
              role === UserRole.SUPER_ADMIN ||
              role === UserRole.ADMIN_OPERATIONS ||
              role === 'ADMIN'
            );
          }
        } catch {
          return false;
        }
      }

      return false;
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
  async getPublishedCatalog(
    @Query() query: PublicCatalogQueryDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoCacheHeaders(res);
    const wantsPreview = query?.preview === 'true' || req.query?.preview === 'true';
    const isAdmin = wantsPreview ? await this.verifyAdminCaller(req) : false;
    return this.productsService.getPublishedCatalog(query, isAdmin);
  }

  @Get('featured')
  async getFeaturedCatalog(
    @Query('preview') preview: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoCacheHeaders(res);
    const wantsPreview = preview === 'true';
    const isAdmin = wantsPreview ? await this.verifyAdminCaller(req) : false;
    return this.productsService.getPublishedCatalog({ featured: true }, isAdmin);
  }

  @Get('hero')
  async getHeroSlides(
    @Query('preview') preview: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoCacheHeaders(res);
    const wantsPreview = preview === 'true';
    const isAdmin = wantsPreview ? await this.verifyAdminCaller(req) : false;
    return this.productsService.getHeroSlides(isAdmin);
  }

  @Get('category/:category')
  async getByCategory(
    @Param('category') category: string,
    @Query('preview') preview: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoCacheHeaders(res);
    const wantsPreview = preview === 'true';
    const isAdmin = wantsPreview ? await this.verifyAdminCaller(req) : false;
    return this.productsService.getPublishedByCategory(category, isAdmin);
  }

  @Get(':slug')
  async getProductBySlug(
    @Param('slug') slug: string,
    @Query('preview') preview: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.setNoCacheHeaders(res);
    const wantsPreview = preview === 'true';
    const isAdmin = wantsPreview ? await this.verifyAdminCaller(req) : false;
    return this.productsService.getPublishedProductBySlug(slug, isAdmin);
  }
}

// =============================================================================
// 2. PROTECTED ADMIN PRODUCT MANAGEMENT CONTROLLER (/api/admin/products)
// =============================================================================
@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
@Roles(UserRole.SUPER_ADMIN)
export class ProductsAdminController {
  constructor(
    private readonly productsService: ProductsService,
    private readonly storageService: StorageService
  ) {}

  @Get()
  async getAllProducts(@Query() query: AdminProductQueryDto) {
    return this.productsService.getAllProductsAdmin(query);
  }

  @Post('upload-image')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProductImage(
    @UploadedFile() file: Express.Multer.File,
    @Query('slug') slug?: string
  ) {
    return this.storageService.uploadProductImage(file, slug);
  }

  @Delete('image')
  async deleteProductImage(@Query('url') url: string) {
    if (!url) {
      throw new BadRequestException('Image URL is required');
    }
    return this.storageService.safeDeleteImage(url);
  }

  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.getProductByIdAdmin(id);
  }

  @Post()
  async createProduct(@Body() body: CreateProductDto, @CurrentUser() user: any) {
    return this.productsService.createProduct(body, user?.memberId || user?.id);
  }

  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() body: UpdateProductDto,
    @CurrentUser() user: any
  ) {
    return this.productsService.updateProduct(id, body, user?.memberId || user?.id);
  }

  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: ProductStatus,
    @CurrentUser() user: any
  ) {
    if (!status) {
      throw new BadRequestException('Status field is required');
    }
    return this.productsService.updateStatus(id, status, user?.memberId || user?.id);
  }

  @Patch(':id/featured')
  async toggleFeatured(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.toggleFeatured(id, user?.memberId || user?.id);
  }

  @Patch(':id/hero')
  async toggleHero(@Param('id') id: string, @CurrentUser() user: any) {
    return this.productsService.toggleHero(id, user?.memberId || user?.id);
  }

  @Patch('reorder')
  async reorderProducts(
    @Body() body: any,
    @CurrentUser() user: any
  ) {
    const rawItems = Array.isArray(body) ? body : (body?.items || body?.orders || []);
    if (!Array.isArray(rawItems) || rawItems.length === 0) {
      throw new BadRequestException('Items or orders array is required for reordering');
    }
    const items = rawItems.map((item: any) => ({
      id: item.id,
      displayOrder: item.displayOrder !== undefined ? item.displayOrder : item.order,
    }));
    return this.productsService.reorderProducts(items, user?.memberId || user?.id);
  }

  @Delete(':id')
  async deleteProduct(
    @Param('id') id: string,
    @Query('permanent') permanent: string,
    @CurrentUser() user: any
  ) {
    const isPermanent = permanent === 'true';
    return this.productsService.deleteProduct(id, isPermanent, user?.memberId || user?.id);
  }
}

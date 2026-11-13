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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
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

// =============================================================================
// 1. PUBLIC SHOWROOM CATALOG CONTROLLER (/api/catalog)
// =============================================================================
@Controller('catalog')
export class CatalogPublicController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  async getPublishedCatalog(@Query() query: PublicCatalogQueryDto) {
    return this.productsService.getPublishedCatalog(query);
  }

  @Get('featured')
  async getFeaturedCatalog() {
    return this.productsService.getPublishedCatalog({ featured: true });
  }

  @Get('category/:category')
  async getByCategory(@Param('category') category: string) {
    return this.productsService.getPublishedByCategory(category);
  }

  @Get(':slug')
  async getProductBySlug(@Param('slug') slug: string) {
    return this.productsService.getPublishedProductBySlug(slug);
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

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsService } from './products.service';
import { StorageService } from './storage.service';
import { CatalogPublicController, ProductsAdminController } from './products.controller';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [CatalogPublicController, ProductsAdminController],
  providers: [ProductsService, StorageService],
  exports: [ProductsService, StorageService],
})
export class ProductsModule {}


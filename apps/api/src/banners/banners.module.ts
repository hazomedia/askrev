import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { BannersService } from './banners.service';
import { BannersController } from './banners.controller';
import { BannersAdminController } from './banners-admin.controller';

@Module({
  imports: [PrismaModule, ProductsModule, JwtModule.register({})],
  controllers: [BannersController, BannersAdminController],
  providers: [BannersService],
  exports: [BannersService],
})
export class BannersModule {}

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ProductsModule } from '../products/products.module';
import { HeroSliderService } from './hero-slider.service';
import {
  HeroSliderPublicController,
  HeroSliderAdminController,
} from './hero-slider.controller';

@Module({
  imports: [PrismaModule, ProductsModule, JwtModule.register({})],
  controllers: [HeroSliderPublicController, HeroSliderAdminController],
  providers: [HeroSliderService],
  exports: [HeroSliderService],
})
export class HeroSliderModule {}

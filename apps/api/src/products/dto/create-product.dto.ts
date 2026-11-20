import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsArray,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ProductCategory, ProductStatus, ProductAvailability } from '@askrev/shared';

export class ProductColorDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  hex: string;

  @IsString()
  @IsOptional()
  accentHex?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsOptional()
  images?: ProductImageDto[];

  @IsString()
  @IsOptional()
  primaryImage?: string;

  @IsString()
  @IsOptional()
  sku?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}

export class ProductSpecificationDto {
  @IsString()
  @IsNotEmpty()
  label: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsOptional()
  sub?: string;
}

export class ProductImageDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsOptional()
  publicId?: string;

  @IsBoolean()
  @IsOptional()
  isPrimary?: boolean;

  @IsNumber()
  @IsOptional()
  order?: number;

  @IsString()
  @IsOptional()
  caption?: string;
}

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  modelCode?: string;

  @IsEnum(ProductCategory)
  category: ProductCategory;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  tagline?: string;

  @IsString()
  @IsOptional()
  shortDescription?: string;

  @IsString()
  @IsOptional()
  fullDescription?: string;

  // Prices in Rupees from UI or integer Paise
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  regularPriceINR?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  sellingPriceINR?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  bookingAmountINR?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  voucherRedeemLimitINR?: number;

  @IsOptional()
  regularPricePaise?: any;

  @IsOptional()
  sellingPricePaise?: any;

  @IsOptional()
  bookingAmountPaise?: any;

  @IsOptional()
  voucherRedeemLimitPaise?: any;

  // Performance specifications (nullable)
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  rangeKm?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  topSpeedKmh?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  batteryCapacityKwh?: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @IsOptional()
  chargingTimeHours?: number;

  @IsString()
  @IsOptional()
  motorPower?: string;

  @IsString()
  @IsOptional()
  acceleration?: string;

  @IsString()
  @IsOptional()
  warranty?: string;

  @IsString()
  @IsOptional()
  powertrain?: string;

  @IsArray()
  @IsOptional()
  colors?: ProductColorDto[];

  @IsArray()
  @IsOptional()
  specifications?: ProductSpecificationDto[];

  @IsArray()
  @IsOptional()
  highlights?: string[];

  @IsArray()
  @IsOptional()
  images?: ProductImageDto[];

  @IsString()
  @IsOptional()
  heroImage?: string;

  @IsString()
  @IsOptional()
  thumbnailImage?: string;

  @IsBoolean()
  @IsOptional()
  isHero?: boolean;

  @IsString()
  @IsOptional()
  heroMobileImage?: string;

  @IsString()
  @IsOptional()
  heroHeading?: string;

  @IsString()
  @IsOptional()
  heroDescription?: string;

  @IsString()
  @IsOptional()
  heroCtaText?: string;

  @IsString()
  @IsOptional()
  heroCtaLink?: string;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  heroSlideOrder?: number;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsString()
  @IsOptional()
  oemManufacturer?: string;

  @IsString()
  @IsOptional()
  oemModelName?: string;

  @IsString()
  @IsOptional()
  oemReference?: string;

  @IsString()
  @IsOptional()
  internalNotes?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  slugAliases?: string[];

  @IsBoolean()
  @IsOptional()
  isRebranded?: boolean;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  @IsEnum(ProductAvailability)
  @IsOptional()
  availability?: ProductAvailability;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  displayOrder?: number;

  @IsString()
  @IsOptional()
  evBikeId?: string;
}

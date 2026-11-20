import { IsOptional } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto implements Partial<CreateProductDto> {
  @IsOptional()
  name?: string;

  @IsOptional()
  slug?: string;

  @IsOptional()
  category?: any;

  @IsOptional()
  brand?: string;

  @IsOptional()
  tagline?: string;

  @IsOptional()
  shortDescription?: string;

  @IsOptional()
  fullDescription?: string;

  @IsOptional()
  regularPriceINR?: number;

  @IsOptional()
  sellingPriceINR?: number;

  @IsOptional()
  bookingAmountINR?: number;

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

  @IsOptional()
  modelCode?: string;

  @IsOptional()
  rangeKm?: number;

  @IsOptional()
  topSpeedKmh?: number;

  @IsOptional()
  batteryCapacityKwh?: number;

  @IsOptional()
  chargingTimeHours?: number;

  @IsOptional()
  motorPower?: string;

  @IsOptional()
  acceleration?: string;

  @IsOptional()
  warranty?: string;

  @IsOptional()
  powertrain?: string;

  @IsOptional()
  colors?: any[];

  @IsOptional()
  specifications?: any[];

  @IsOptional()
  highlights?: string[];

  @IsOptional()
  images?: any[];

  @IsOptional()
  heroImage?: string;

  @IsOptional()
  thumbnailImage?: string;

  @IsOptional()
  isHero?: boolean;

  @IsOptional()
  heroMobileImage?: string;

  @IsOptional()
  heroHeading?: string;

  @IsOptional()
  heroDescription?: string;

  @IsOptional()
  heroCtaText?: string;

  @IsOptional()
  heroCtaLink?: string;

  @IsOptional()
  heroSlideOrder?: number;

  @IsOptional()
  oemManufacturer?: string;

  @IsOptional()
  oemModelName?: string;

  @IsOptional()
  oemReference?: string;

  @IsOptional()
  internalNotes?: string;

  @IsOptional()
  slugAliases?: string[];

  @IsOptional()
  isRebranded?: boolean;

  @IsOptional()
  isFeatured?: boolean;

  @IsOptional()
  status?: any;

  @IsOptional()
  availability?: any;

  @IsOptional()
  displayOrder?: number;

  @IsOptional()
  evBikeId?: string;
}

import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { PrismaService } from '../prisma/prisma.service';

export interface UploadResult {
  url: string;
  filename: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
  storageProvider: 'cloudflare-r2' | 'local';
  isPrimary?: boolean;
  order?: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly maxSizeBytes = 10 * 1024 * 1024; // 10MB maximum
  private readonly uploadDir = path.resolve(process.cwd(), '../web/public/uploads/products');
  private readonly heroUploadDir = path.resolve(process.cwd(), '../web/public/uploads/hero');
  private readonly bannerUploadDir = path.resolve(process.cwd(), '../web/public/uploads/banners');
  private s3Client: S3Client | null = null;
  private bucketName = '';
  private isR2Configured = false;

  constructor(private readonly prisma: PrismaService) {
    this.initR2();
    this.ensureUploadDir();
  }

  private initR2() {
    const accountId = process.env.R2_ACCOUNT_ID?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
    const bucketName = process.env.R2_BUCKET_NAME?.trim() || 'askrev-media';

    if (accountId && accessKeyId && secretAccessKey) {
      try {
        this.s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        this.bucketName = bucketName;
        this.isR2Configured = true;
        this.logger.log(`⚡ Cloudflare R2 Storage Service Active (Bucket: ${bucketName})`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize Cloudflare R2 client: ${err.message}`);
        this.isR2Configured = false;
      }
    } else {
      this.logger.log('ℹ️ Cloudflare R2 credentials not detected; using durable local storage for development/testing.');
      this.isR2Configured = false;
    }
  }

  public getS3Client(): S3Client | null {
    return this.s3Client;
  }

  public getBucketName(): string {
    return this.bucketName;
  }

  public isConfigured(): boolean {
    return this.isR2Configured && this.s3Client !== null;
  }

  private ensureUploadDir() {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
      }
      const heroDesktopDir = path.join(this.heroUploadDir, 'desktop');
      const heroMobileDir = path.join(this.heroUploadDir, 'mobile');
      if (!fs.existsSync(heroDesktopDir)) {
        fs.mkdirSync(heroDesktopDir, { recursive: true });
      }
      if (!fs.existsSync(heroMobileDir)) {
        fs.mkdirSync(heroMobileDir, { recursive: true });
      }
      const bannerTopDir = path.join(this.bannerUploadDir, 'top');
      const bannerPopupDir = path.join(this.bannerUploadDir, 'popup');
      if (!fs.existsSync(bannerTopDir)) {
        fs.mkdirSync(bannerTopDir, { recursive: true });
      }
      if (!fs.existsSync(bannerPopupDir)) {
        fs.mkdirSync(bannerPopupDir, { recursive: true });
      }
    } catch (err: any) {
      this.logger.error(`Could not create local upload directory: ${err.message}`);
    }
  }

  /**
   * Cryptographic file signature (magic numbers) detection.
   * Prevents MIME-spoofing and malicious file execution.
   */
  public detectMagicMime(buffer: Buffer): { mime: string; ext: string } | null {
    if (!buffer || buffer.length < 12) return null;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return { mime: 'image/jpeg', ext: 'jpg' };
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return { mime: 'image/png', ext: 'png' };
    }

    // WebP: RIFF ... WEBP
    if (
      buffer[0] === 0x52 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x46 &&
      buffer[8] === 0x57 &&
      buffer[9] === 0x45 &&
      buffer[10] === 0x42 &&
      buffer[11] === 0x50
    ) {
      return { mime: 'image/webp', ext: 'webp' };
    }

    return null;
  }

  /**
   * Upload vehicle photograph with magic byte validation and size enforcement.
   * Direct to Cloudflare R2 when configured, otherwise durable local static storage.
   *
   * Structure:
   * Gallery: vehicles/{slug}/gallery/{uuid}.{ext}
   * Variants: vehicles/{slug}/variants/{uuid}.{ext}
   */
  async uploadProductImage(
    file: Express.Multer.File,
    slugPrefix = 'catalog',
    target: 'gallery' | 'variant' | 'variants' = 'gallery'
  ): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file payload provided');
    }

    // 1. Enforce strict file size limit (10MB)
    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException(
        `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds maximum allowed limit (10 MB).`
      );
    }

    // 2. Validate actual cryptographic file signature (magic numbers)
    const detected = this.detectMagicMime(file.buffer);
    if (!detected) {
      throw new BadRequestException(
        `Invalid image format or corrupted file signature. Only authentic JPEG, PNG, and WebP images are permitted.`
      );
    }

    // 3. Generate secure, collision-free object key matching production structure
    const cleanPrefix = slugPrefix.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 35) || 'catalog';
    const subfolder = target === 'variant' || target === 'variants' ? 'variants' : 'gallery';
    const uuid = crypto.randomUUID();
    const objectKey = `vehicles/${cleanPrefix}/${subfolder}/${uuid}.${detected.ext}`;

    // 4. If Cloudflare R2 is configured, upload to Cloudflare R2
    if (this.isR2Configured && this.s3Client) {
      return this.uploadToR2(file, objectKey, detected.mime);
    }

    // In production, prevent writing uploads to ephemeral server filesystem
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException(
        'Persistent cloud storage (Cloudflare R2) is not configured in production. Ephemeral uploads are disabled until R2 credentials are set.'
      );
    }

    // 5. Fallback to durable local storage in development/staging
    return this.uploadToLocal(file, objectKey, detected.mime);
  }

  /**
   * Upload hero slide photograph (desktop or mobile) with strict validation.
   *
   * Structure:
   * Desktop: hero/desktop/{uuid}.{ext}
   * Mobile: hero/mobile/{uuid}.{ext}
   */
  async uploadHeroImage(
    file: Express.Multer.File,
    kind: 'desktop' | 'mobile' = 'desktop',
    nameSlug = 'hero'
  ): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file payload provided');
    }

    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException(
        `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds maximum allowed limit (10 MB).`
      );
    }

    const detected = this.detectMagicMime(file.buffer);
    if (!detected) {
      throw new BadRequestException(
        `Invalid image format or corrupted file signature. Only authentic JPEG, PNG, and WebP images are permitted.`
      );
    }

    const uuid = crypto.randomUUID();
    const objectKey = `hero/${kind}/${uuid}.${detected.ext}`;

    if (this.isR2Configured && this.s3Client) {
      return this.uploadToR2(file, objectKey, detected.mime);
    }

    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException(
        'Persistent cloud storage (Cloudflare R2) is not configured in production. Ephemeral hero uploads are disabled until R2 credentials are set.'
      );
    }

    // Local fallback in development/staging
    this.ensureUploadDir();
    const basename = `${kind}_${uuid}.${detected.ext}`;
    const targetPath = path.join(this.heroUploadDir, kind, basename);

    fs.writeFileSync(targetPath, file.buffer);

    const publicUrl = `/uploads/hero/${kind}/${basename}`;
    this.logger.log(`Saved hero ${kind} image locally: ${publicUrl} (${(file.size / 1024).toFixed(1)} KB)`);

    return {
      url: publicUrl,
      filename: basename,
      originalName: file.originalname,
      sizeBytes: file.size,
      mimeType: detected.mime,
      storageProvider: 'local',
    };
  }

  /**
   * Upload Banner Image (Dashboard Top Banner or Welcome Popup)
   * Target path:
   * R2: banners/{kind}/{uuid}.{ext}
   * Local: /uploads/banners/{kind}/{uuid}.{ext}
   */
  async uploadBannerImage(
    file: Express.Multer.File,
    kind: 'top' | 'popup' = 'top'
  ): Promise<UploadResult> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No image file payload provided');
    }

    if (file.size > this.maxSizeBytes) {
      throw new BadRequestException(
        `File size (${(file.size / 1024 / 1024).toFixed(1)} MB) exceeds maximum allowed limit (10 MB).`
      );
    }

    const detected = this.detectMagicMime(file.buffer);
    if (!detected) {
      throw new BadRequestException(
        'Invalid image format or corrupted file signature. Only authentic JPEG, PNG, and WebP images are permitted.'
      );
    }

    const uuid = crypto.randomUUID();
    const objectKey = `banners/${kind}/${uuid}.${detected.ext}`;

    if (this.isR2Configured && this.s3Client) {
      return this.uploadToR2(file, objectKey, detected.mime);
    }

    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException(
        'Persistent cloud storage (Cloudflare R2) is not configured in production. Ephemeral banner uploads are disabled until R2 credentials are set.'
      );
    }

    this.ensureUploadDir();
    const basename = `${kind}_${uuid}.${detected.ext}`;
    const targetPath = path.join(this.bannerUploadDir, kind, basename);

    fs.writeFileSync(targetPath, file.buffer);

    const publicUrl = `/uploads/banners/${kind}/${basename}`;
    this.logger.log(`Saved banner ${kind} image locally: ${publicUrl} (${(file.size / 1024).toFixed(1)} KB)`);

    return {
      url: publicUrl,
      filename: basename,
      originalName: file.originalname,
      sizeBytes: file.size,
      mimeType: detected.mime,
      storageProvider: 'local',
    };
  }

  private async uploadToR2(
    file: Express.Multer.File,
    objectKey: string,
    mimeType: string
  ): Promise<UploadResult> {
    try {
      await this.s3Client!.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
          Body: file.buffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=86400, stale-while-revalidate=3600',
          Metadata: {
            originalname: encodeURIComponent(file.originalname),
            uploadedat: new Date().toISOString(),
          },
        })
      );

      // Stable Railway API media delivery endpoint
      const url = `/api/media/${objectKey}`;

      this.logger.log(`Uploaded image to Cloudflare R2: ${objectKey} (${(file.size / 1024).toFixed(1)} KB)`);

      return {
        url,
        filename: objectKey,
        originalName: file.originalname,
        sizeBytes: file.size,
        mimeType,
        storageProvider: 'cloudflare-r2',
      };
    } catch (err: any) {
      this.logger.error(`Cloudflare R2 upload error: ${err.message}.`);
      if (process.env.NODE_ENV === 'production') {
        throw new BadRequestException(`Cloudflare R2 upload failed: ${err.message}`);
      }
      return this.uploadToLocal(file, objectKey, mimeType);
    }
  }

  private async uploadToLocal(
    file: Express.Multer.File,
    objectKey: string,
    mimeType: string
  ): Promise<UploadResult> {
    this.ensureUploadDir();

    const basename = path.basename(objectKey);
    const targetPath = path.join(this.uploadDir, basename);

    fs.writeFileSync(targetPath, file.buffer);

    const publicUrl = `/uploads/products/${basename}`;
    this.logger.log(`Saved product image locally: ${publicUrl} (${(file.size / 1024).toFixed(1)} KB)`);

    return {
      url: publicUrl,
      filename: basename,
      originalName: file.originalname,
      sizeBytes: file.size,
      mimeType,
      storageProvider: 'local',
    };
  }

  /**
   * Safe deletion: checks if image is referenced by any product or hero slide before deleting.
   * Never permits arbitrary object keys or path traversal.
   */
  async safeDeleteImage(imageUrlOrKey: string): Promise<{ deleted: boolean; reason?: string }> {
    if (!imageUrlOrKey) return { deleted: false, reason: 'Empty image identifier' };

    // Strip leading API prefix or path
    let objectKey = imageUrlOrKey.trim().replace(/^\/?api\/media\/?/, '').replace(/^\/+/, '');
    if (objectKey.includes('?')) {
      objectKey = objectKey.split('?')[0];
    }

    // Validate path safety
    if (
      objectKey.includes('..') ||
      objectKey.includes('\\') ||
      objectKey.includes('\0') ||
      !/^[a-zA-Z0-9_\-\./]+$/.test(objectKey)
    ) {
      throw new BadRequestException('Invalid object key for deletion');
    }

    // Only allow deletion within approved media namespaces
    const isApprovedNamespace =
      objectKey.startsWith('hero/') ||
      objectKey.startsWith('vehicles/') ||
      objectKey.startsWith('products/') ||
      objectKey.startsWith('test-');

    if (!isApprovedNamespace) {
      throw new BadRequestException('Deletion permitted only within approved media prefixes (hero, vehicles, products, test)');
    }

    const normalize = (val: any): string => {
      if (!val) return '';
      const str = typeof val === 'string' ? val : val?.url || '';
      return path.basename(str.split('?')[0]);
    };

    const targetBasename = normalize(objectKey);

    // 1. Check if referenced by any Product
    const allProducts = await this.prisma.product.findMany({
      select: { id: true, name: true, images: true, colors: true, heroImage: true, thumbnailImage: true, heroMobileImage: true },
    });

    const isReferencedInProducts = allProducts.some((p) => {
      if (
        (p.heroImage && p.heroImage.includes(targetBasename)) ||
        (p.thumbnailImage && p.thumbnailImage.includes(targetBasename)) ||
        (p.heroMobileImage && p.heroMobileImage.includes(targetBasename))
      ) {
        return true;
      }
      if (Array.isArray(p.images)) {
        const matches = (p.images as any[]).some((img) => normalize(img) === targetBasename);
        if (matches) return true;
      }
      if (Array.isArray(p.colors)) {
        const matchesColor = (p.colors as any[]).some((c) => {
          if (normalize(c?.primaryImage) === targetBasename) return true;
          if (Array.isArray(c?.images)) {
            return c.images.some((img: any) => normalize(img) === targetBasename);
          }
          return false;
        });
        if (matchesColor) return true;
      }
      return false;
    });

    if (isReferencedInProducts) {
      this.logger.warn(`Skipped deletion of ${objectKey}: Referenced by a vehicle product.`);
      return { deleted: false, reason: 'Image is currently referenced by a vehicle product' };
    }

    // 2. Check if referenced by any HomepageHeroSlide
    const allSlides = await this.prisma.homepageHeroSlide.findMany({
      select: { id: true, heading: true, desktopImageUrl: true, mobileImageUrl: true },
    });

    const isReferencedInSlides = allSlides.some((s) => {
      return (
        (s.desktopImageUrl && s.desktopImageUrl.includes(targetBasename)) ||
        (s.mobileImageUrl && s.mobileImageUrl.includes(targetBasename))
      );
    });

    if (isReferencedInSlides) {
      this.logger.warn(`Skipped deletion of ${objectKey}: Referenced by a homepage hero slide.`);
      return { deleted: false, reason: 'Image is currently referenced by a homepage hero slide' };
    }

    // 3. Delete from Cloudflare R2
    if (this.isR2Configured && this.s3Client) {
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: this.bucketName,
            Key: objectKey,
          })
        );
        this.logger.log(`Deleted image from Cloudflare R2: ${objectKey}`);
        return { deleted: true };
      } catch (err: any) {
        this.logger.error(`Error deleting from Cloudflare R2: ${err.message}`);
      }
    }

    // 4. Fallback: check local disk deletion
    try {
      const basename = path.basename(objectKey);
      const filePath = path.join(this.uploadDir, basename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted local image: ${filePath}`);
        return { deleted: true };
      }
    } catch (err: any) {
      this.logger.error(`Error deleting local image: ${err.message}`);
    }

    return { deleted: false, reason: 'File not found on storage provider' };
  }
}

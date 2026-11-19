import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
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
  private s3Client: S3Client | null = null;
  private isR2Configured = false;

  constructor(private readonly prisma: PrismaService) {
    this.initR2();
    this.ensureUploadDir();
  }

  private initR2() {
    const accountId = process.env.R2_ACCOUNT_ID?.trim();
    const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
    const bucketName = process.env.R2_BUCKET_NAME?.trim();

    if (accountId && accessKeyId && secretAccessKey && bucketName) {
      try {
        this.s3Client = new S3Client({
          region: 'auto',
          endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
          credentials: {
            accessKeyId,
            secretAccessKey,
          },
        });
        this.isR2Configured = true;
        this.logger.log(`⚡ Cloudflare R2 Free Tier Storage Active (Bucket: ${bucketName})`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize Cloudflare R2 client: ${err.message}`);
        this.isR2Configured = false;
      }
    } else {
      this.logger.log('ℹ️ Cloudflare R2 credentials not detected; using durable local storage for development/testing.');
      this.isR2Configured = false;
    }
  }

  private ensureUploadDir() {
    try {
      if (!fs.existsSync(this.uploadDir)) {
        fs.mkdirSync(this.uploadDir, { recursive: true });
        this.logger.log(`Created product upload directory: ${this.uploadDir}`);
      }
      const heroDesktopDir = path.join(this.heroUploadDir, 'desktop');
      const heroMobileDir = path.join(this.heroUploadDir, 'mobile');
      if (!fs.existsSync(heroDesktopDir)) {
        fs.mkdirSync(heroDesktopDir, { recursive: true });
      }
      if (!fs.existsSync(heroMobileDir)) {
        fs.mkdirSync(heroMobileDir, { recursive: true });
      }
    } catch (err: any) {
      this.logger.error(`Could not create upload directory: ${err.message}`);
    }
  }

  /**
   * Cryptographic file signature (magic numbers) detection.
   * Prevents MIME-spoofing and malicious file execution.
   */
  private detectMagicMime(buffer: Buffer): { mime: string; ext: string } | null {
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
   */
  async uploadProductImage(file: Express.Multer.File, slugPrefix = 'catalog'): Promise<UploadResult> {
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

    // 3. Generate secure, collision-free object key
    const cleanPrefix = slugPrefix.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30);
    const uniqueHash = crypto.randomBytes(8).toString('hex');
    const objectKey = `products/${cleanPrefix}/${Date.now()}_${uniqueHash}.${detected.ext}`;

    // 4. If Cloudflare R2 is configured, upload to Cloudflare R2
    if (this.isR2Configured && this.s3Client) {
      return this.uploadToR2(file, objectKey, detected.mime);
    }

    // 5. Fallback to durable local storage
    return this.uploadToLocal(file, objectKey, detected.mime);
  }

  /**
   * Upload hero slide photograph (desktop or mobile) with strict validation.
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

    const cleanPrefix = nameSlug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30);
    const uniqueHash = crypto.randomBytes(8).toString('hex');
    const objectKey = `hero/${kind}/${cleanPrefix}_${Date.now()}_${uniqueHash}.${detected.ext}`;

    if (this.isR2Configured && this.s3Client) {
      return this.uploadToR2(file, objectKey, detected.mime);
    }

    // Local fallback
    this.ensureUploadDir();
    const basename = path.basename(objectKey);
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

  private async uploadToR2(
    file: Express.Multer.File,
    objectKey: string,
    mimeType: string
  ): Promise<UploadResult> {
    const bucketName = process.env.R2_BUCKET_NAME!;
    const publicBaseUrl = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

    try {
      await this.s3Client!.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: objectKey,
          Body: file.buffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      const url = publicBaseUrl ? `${publicBaseUrl}/${objectKey}` : `https://${bucketName}.r2.cloudflarestorage.com/${objectKey}`;

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
      this.logger.error(`Cloudflare R2 upload error: ${err.message}. Falling back to local storage.`);
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
   * Safe deletion: checks if image is referenced by any published product before deleting.
   */
  async safeDeleteImage(imageUrlOrKey: string): Promise<{ deleted: boolean; reason?: string }> {
    if (!imageUrlOrKey) return { deleted: false, reason: 'Empty image identifier' };

    const normalize = (val: any): string => {
      if (!val) return '';
      const str = typeof val === 'string' ? val : val?.url || '';
      return path.basename(str.split('?')[0]);
    };

    const targetBasename = normalize(imageUrlOrKey);

    // Check if referenced by any published product
    const publishedProducts = await this.prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, name: true, images: true, heroImage: true, thumbnailImage: true },
    });

    const isReferenced = publishedProducts.some((p) => {
      if (normalize(p.heroImage) === targetBasename || normalize(p.thumbnailImage) === targetBasename) {
        return true;
      }
      const images = Array.isArray(p.images) ? (p.images as any[]) : [];
      return images.some((img) => normalize(img) === targetBasename);
    });

    if (isReferenced) {
      this.logger.warn(`Skipped deletion of ${imageUrlOrKey}: Currently referenced by a published vehicle.`);
      return { deleted: false, reason: 'Image is referenced by a published vehicle' };
    }

    // If R2
    if (this.isR2Configured && this.s3Client && imageUrlOrKey.includes('/products/')) {
      try {
        const key = imageUrlOrKey.split('/products/')[1] ? `products/${imageUrlOrKey.split('/products/')[1]}` : imageUrlOrKey;
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME!,
            Key: key,
          })
        );
        this.logger.log(`Deleted image from Cloudflare R2: ${key}`);
        return { deleted: true };
      } catch (err: any) {
        this.logger.error(`Error deleting from R2: ${err.message}`);
      }
    }

    // Local disk deletion
    try {
      const basename = path.basename(imageUrlOrKey);
      const filePath = path.join(this.uploadDir, basename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted local image: ${filePath}`);
        return { deleted: true };
      }
    } catch (err: any) {
      this.logger.error(`Error deleting local image: ${err.message}`);
    }

    return { deleted: false, reason: 'File not found on storage' };
  }
}

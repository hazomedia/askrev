import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Readable } from 'stream';
import * as fs from 'fs';
import * as path from 'path';
import {
  S3Client,
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { getJwtAccessSecret, isAccessTokenRevoked } from '../auth/jwt-secrets';
import { StorageService } from '../products/storage.service';

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private s3Client: S3Client | null = null;
  private bucketName = '';
  private isR2Configured = false;

  // In-memory rate limiter for anonymous requests: max 120 req / 60 seconds per IP
  private readonly anonRateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly storageService: StorageService
  ) {
    this.initR2();
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
        this.logger.log(`⚡ Media Delivery linked to Cloudflare R2 bucket: ${bucketName}`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize MediaService R2 client: ${err.message}`);
        this.isR2Configured = false;
      }
    } else {
      this.logger.log('ℹ️ R2 credentials not detected in MediaService; local fallback active.');
      this.isR2Configured = false;
    }
  }

  /**
   * Extract administrative identity from request if present and valid.
   */
  public extractIsAdmin(req: Request): boolean {
    try {
      let token: string | null = null;
      const authHeader = req.headers?.authorization || '';
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
      } else if (req.cookies) {
        token = req.cookies['askrev_access_token'] || req.cookies['askrev_admin_session'] || null;
      }

      if (!token || isAccessTokenRevoked(token)) {
        return false;
      }

      const payload: any = this.jwtService.verify(token, {
        secret: getJwtAccessSecret(),
      });

      return Boolean(payload && (payload.role === 'SUPER_ADMIN' || payload.role === 'ADMIN'));
    } catch {
      return false;
    }
  }

  /**
   * Rate limiter for anonymous media streaming to prevent scraping abuse.
   */
  private checkAnonymousRateLimit(ip: string): boolean {
    const now = Date.now();
    const record = this.anonRateLimitBuckets.get(ip);
    if (!record || record.resetAt <= now) {
      this.anonRateLimitBuckets.set(ip, { count: 1, resetAt: now + 60000 });
      if (this.anonRateLimitBuckets.size > 2000) {
        for (const [k, v] of this.anonRateLimitBuckets.entries()) {
          if (v.resetAt <= now) this.anonRateLimitBuckets.delete(k);
        }
      }
      return true;
    }

    record.count += 1;
    return record.count <= 120;
  }

  /**
   * Verify if a media asset is attached to published content in the database.
   */
  public async isMediaAttachedToPublishedContent(objectKey: string): Promise<boolean> {
    const now = new Date();
    const keyPattern = objectKey.replace(/^[/\\]+/, '');

    // 1. Check HomepageHeroSlide
    const publishedSlide = await this.prisma.homepageHeroSlide.findFirst({
      where: {
        status: 'PUBLISHED',
        AND: [
          { OR: [{ publishStartAt: null }, { publishStartAt: { lte: now } }] },
          { OR: [{ publishEndAt: null }, { publishEndAt: { gte: now } }] },
        ],
        OR: [
          { desktopImageUrl: { contains: keyPattern } },
          { mobileImageUrl: { contains: keyPattern } },
        ],
      },
    });

    if (publishedSlide) {
      return true;
    }

    // 2. Check Product hero / thumbnail / mobile images
    const publishedProductDirect = await this.prisma.product.findFirst({
      where: {
        status: 'PUBLISHED',
        OR: [
          { heroImage: { contains: keyPattern } },
          { thumbnailImage: { contains: keyPattern } },
          { heroMobileImage: { contains: keyPattern } },
        ],
      },
    });

    if (publishedProductDirect) {
      return true;
    }

    // 3. Check JSON collections (gallery images & variant colors)
    const publishedProducts = await this.prisma.product.findMany({
      where: { status: 'PUBLISHED' },
      select: { images: true, colors: true },
    });

    for (const prod of publishedProducts) {
      if (Array.isArray(prod.images)) {
        const matches = (prod.images as any[]).some((img) => {
          const url = typeof img === 'string' ? img : img?.url || '';
          return url.includes(keyPattern);
        });
        if (matches) return true;
      }

      if (Array.isArray(prod.colors)) {
        const matchesColor = (prod.colors as any[]).some((c) => {
          if (c?.primaryImage && c.primaryImage.includes(keyPattern)) return true;
          if (Array.isArray(c?.images)) {
            return c.images.some((img: any) => {
              const url = typeof img === 'string' ? img : img?.url || '';
              return url.includes(keyPattern);
            });
          }
          return false;
        });
        if (matchesColor) return true;
      }
    }

    // 4. Check DashboardTopBanner
    const publishedTopBanner = this.prisma.dashboardTopBanner
      ? await this.prisma.dashboardTopBanner.findFirst({
          where: {
            isEnabled: true,
            OR: [
              { desktopImageUrl: { contains: keyPattern } },
              { mobileImageUrl: { contains: keyPattern } },
            ],
          },
        })
      : null;

    if (publishedTopBanner) {
      return true;
    }

    // 5. Check PopupCampaign
    const publishedPopup = this.prisma.popupCampaign
      ? await this.prisma.popupCampaign.findFirst({
          where: {
            status: 'PUBLISHED',
            imageUrl: { contains: keyPattern },
          },
        })
      : null;

    if (publishedPopup) {
      return true;
    }

    // 6. Check User Profile Photo (Avatars)
    if (keyPattern.startsWith('avatars/')) {
      const userWithAvatar = await this.prisma.user.findFirst({
        where: {
          profilePhoto: { contains: keyPattern },
        },
        select: { id: true },
      });
      if (userWithAvatar) return true;
    }

    return false;
  }

  /**
   * Stream media object securely from Cloudflare R2 (or fallback to local disk).
   */
  async streamMedia(rawObjectKey: string, req: Request, res: Response): Promise<void> {
    if (!rawObjectKey) {
      throw new BadRequestException('Object key is required');
    }

    // 1. Sanitize object key and prevent path traversal
    const objectKey = decodeURIComponent(rawObjectKey).replace(/^[/\\]+/, '').trim();
    if (
      objectKey.includes('..') ||
      objectKey.includes('\\') ||
      objectKey.includes('\0') ||
      !/^[a-zA-Z0-9_\-\./]+$/.test(objectKey)
    ) {
      throw new BadRequestException('Invalid media object path');
    }

    const isAdmin = this.extractIsAdmin(req);

    // 2. Access control check
    const isPublished = await this.isMediaAttachedToPublishedContent(objectKey);

    if (!isPublished) {
      // If not published content, only authenticated administrators may view
      if (!isAdmin) {
        throw new ForbiddenException(
          'Access denied: This media asset is in draft or unpublished state. Administrator authentication is required.'
        );
      }
    } else {
      // For anonymous access to published media, enforce lightweight rate limiting
      if (!isAdmin) {
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
        if (!this.checkAnonymousRateLimit(clientIp)) {
          res.status(429).json({
            statusCode: 429,
            message: 'Too many media requests. Please wait a moment.',
          });
          return;
        }
      }
    }

    // 3. Stream from Cloudflare R2 if configured
    if (this.isR2Configured && this.s3Client) {
      try {
        const command = new GetObjectCommand({
          Bucket: this.bucketName,
          Key: objectKey,
        });

        const s3Response = await this.s3Client.send(command);

        // Conditional GET: Return 304 Not Modified if ETag matches
        const ifNoneMatch = req.headers['if-none-match'];
        if (ifNoneMatch && s3Response.ETag && ifNoneMatch === s3Response.ETag) {
          res.status(304).end();
          return;
        }

        // Set Headers
        res.setHeader('Content-Type', s3Response.ContentType || 'image/jpeg');
        if (s3Response.ContentLength) {
          res.setHeader('Content-Length', s3Response.ContentLength);
        }
        if (s3Response.ETag) {
          res.setHeader('ETag', s3Response.ETag);
        }
        if (s3Response.LastModified) {
          res.setHeader('Last-Modified', s3Response.LastModified.toUTCString());
        }
        res.setHeader('X-Content-Type-Options', 'nosniff');

        // Bounded caching: public for published content, private no-cache for draft preview
        if (isPublished) {
          res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
        } else {
          res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
        }

        const bodyStream = s3Response.Body as Readable;
        bodyStream.on('error', (streamErr) => {
          this.logger.error(`Stream error on object ${objectKey}: ${streamErr.message}`);
          if (!res.headersSent) {
            res.status(500).end();
          }
        });

        bodyStream.pipe(res);
        return;
      } catch (err: any) {
        if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
          // If not in R2, check local fallback before returning 404
        } else {
          this.logger.error(`Cloudflare R2 GetObject error for ${objectKey}: ${err.message}`);
          throw err;
        }
      }
    }

    // 4. Fallback to local disk (development / local uploaded files)
    const localWebDir = path.resolve(process.cwd(), '../web/public');
    const localUploadPath = path.join(localWebDir, 'uploads', objectKey);
    const localDirectPath = path.join(localWebDir, objectKey);

    const targetLocalPath = fs.existsSync(localUploadPath)
      ? localUploadPath
      : fs.existsSync(localDirectPath)
      ? localDirectPath
      : null;

    if (targetLocalPath) {
      const ext = path.extname(targetLocalPath).toLowerCase();
      const mimeMap: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.webp': 'image/webp',
        '.svg': 'image/svg+xml',
      };

      res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (isPublished) {
        res.setHeader('Cache-Control', 'public, max-age=86400, stale-while-revalidate=3600');
      } else {
        res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
      }

      const fileStream = fs.createReadStream(targetLocalPath);
      fileStream.pipe(res);
      return;
    }

    // Object not found in R2 or local fallback
    throw new NotFoundException(`Media asset not found: ${objectKey}`);
  }
}

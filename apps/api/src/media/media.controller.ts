import { Controller, Get, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { MediaService } from './media.service';

@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  /**
   * Secure Media Streaming Route
   *
   * Route: GET /api/media/*
   * (e.g. GET /api/media/hero/desktop/123-abc.webp, GET /api/media/vehicles/s01/gallery/456.webp)
   */
  @Get('*')
  async serveMedia(@Req() req: Request, @Res() res: Response) {
    const rawPath = (
      req.params[0] ||
      (req.params as any)['0'] ||
      (req.originalUrl || req.url || '').split('?')[0].replace(/^\/?api\/media\/?/, '')
    ).replace(/^\/+/, '');

    await this.mediaService.streamMedia(rawPath, req, res);
  }
}

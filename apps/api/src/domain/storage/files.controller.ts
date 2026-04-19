import {
  Controller,
  Get,
  Param,
  Req,
  Res,
  Logger,
  NotFoundException,
  BadRequestException,
  VERSION_NEUTRAL,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { S3Service } from '../../shared/services/s3.service';

// Regex patterns for validation
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_FILENAME_REGEX = /^[a-zA-Z0-9_-]+\.(webp|jpg|jpeg|png|gif)$/i;
// Safe path segment: alphanumeric, hyphens, underscores, dots (no ..)
const SAFE_PATH_SEGMENT = /^[a-zA-Z0-9_.-]+$/;

/**
 * Files Controller - Serves S3 assets via presigned URL redirects
 *
 * This controller is VERSION_NEUTRAL meaning it's accessible at /api/users/...
 * without the /v1 version prefix. This allows raw S3 keys stored in the database
 * to be resolved to presigned URLs without breaking existing data.
 */
@Controller({ version: VERSION_NEUTRAL })
export class FilesController {
  private readonly bucket = process.env.S3_BUCKET || 'rukny-storage';
  private readonly logger = new Logger(FilesController.name);

  constructor(private readonly s3Service: S3Service) {}

  /**
   * Generic media proxy - streams S3 objects directly to the client.
   * URLs are stable (never expire), unlike presigned URLs.
   * Supports: products/*, users/*, profiles/*, banners/*, logos/*
   * 
   * Example: GET /api/media/products/abc123/image.jpg
   */
  @Get('media/*')
  async streamMedia(
    @Req() req: Request,
    @Res() res: Response,
  ) {
    // Extract path after /api/media/
    const prefix = '/api/media/';
    const idx = req.originalUrl.indexOf(prefix);
    const rawPath = idx !== -1 ? decodeURIComponent(req.originalUrl.slice(idx + prefix.length).split('?')[0]) : '';
    
    if (!rawPath) {
      throw new BadRequestException('Missing media path');
    }

    // Validate each path segment to prevent path traversal
    const segments = rawPath.split('/');
    for (const segment of segments) {
      if (!segment || segment === '..' || segment === '.' || !SAFE_PATH_SEGMENT.test(segment)) {
        throw new BadRequestException('Invalid media path');
      }
    }

    // Whitelist allowed prefixes
    const allowedPrefixes = ['products/', 'users/', 'profiles/', 'banners/', 'logos/', 'stores/', 'wallpapers/'];
    if (!allowedPrefixes.some(prefix => rawPath.startsWith(prefix))) {
      throw new BadRequestException('Invalid media path');
    }

    try {
      const data = await this.s3Service.getObject(this.bucket, rawPath);
      
      if (!data) {
        throw new NotFoundException('Media not found');
      }

      // Determine content type from extension
      const ext = rawPath.split('.').pop()?.toLowerCase();
      const contentTypes: Record<string, string> = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        svg: 'image/svg+xml',
        mp4: 'video/mp4',
        pdf: 'application/pdf',
      };
      const contentType = contentTypes[ext || ''] || 'application/octet-stream';

      res.set({
        'Content-Type': contentType,
        'Content-Length': data.length.toString(),
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      });
      
      return res.send(data);
    } catch (error: any) {
      this.logger.warn(`Media not found: ${rawPath} - ${error?.message}`);
      throw new NotFoundException('Media not found');
    }
  }

  @Get('users/:userId/profile/avatar/:filename')
  async getAvatar(
    @Param('userId') userId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Path Traversal Protection
    this.validatePathParams(userId, filename);
    
    const key = `users/${userId}/profile/avatar/${filename}`;
    const url = await this.s3Service.getPresignedGetUrl(this.bucket, key, 3600);
    return res.redirect(url);
  }

  @Get('users/:userId/profile/cover/:filename')
  async getCover(
    @Param('userId') userId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ) {
    // Path Traversal Protection
    this.validatePathParams(userId, filename);
    
    const key = `users/${userId}/profile/cover/${filename}`;
    const url = await this.s3Service.getPresignedGetUrl(this.bucket, key, 3600);
    return res.redirect(url);
  }

  /**
   * Validate path parameters to prevent Path Traversal attacks
   * - userId must be a valid UUID
   * - filename must match safe pattern (alphanumeric + allowed extensions)
   */
  private validatePathParams(userId: string, filename: string): void {
    if (!userId || !filename) {
      throw new NotFoundException('Missing required parameters');
    }

    // Check for path traversal attempts
    if (userId.includes('..') || userId.includes('/') || userId.includes('\\')) {
      throw new BadRequestException('Invalid userId format');
    }

    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      throw new BadRequestException('Invalid filename format');
    }

    // Validate UUID format for userId
    if (!UUID_REGEX.test(userId)) {
      throw new BadRequestException('Invalid userId format');
    }

    // Validate safe filename pattern
    if (!SAFE_FILENAME_REGEX.test(filename)) {
      throw new BadRequestException('Invalid filename format');
    }
  }
}

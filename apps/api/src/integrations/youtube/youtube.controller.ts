import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { YouTubeService } from './youtube.service';
import { JwtAuthGuard } from '../../core/common/guards/auth/jwt-auth.guard';

@Controller('integrations/youtube')
export class YouTubeController {
  private readonly frontendUrl: string;

  constructor(
    private readonly youtubeService: YouTubeService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('FRONTEND_URL_DEV') ||
      'http://localhost:3000';
  }

  /**
   * Start YouTube OAuth flow
   * GET /api/v1/integrations/youtube/auth
   */
  @Get('auth')
  @UseGuards(JwtAuthGuard)
  async authorize(@Req() req: any, @Res() res: Response) {
    const state = Buffer.from(req.user.id).toString('base64url');
    const authUrl = this.youtubeService.getAuthUrl(state);
    return res.redirect(authUrl);
  }

  /**
   * OAuth callback — Google redirects here with code
   * GET /api/v1/integrations/youtube/callback?code=xxx&state=xxx
   */
  @Get('callback')
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string,
    @Res() res: Response,
  ) {
    const redirectBase = `${this.frontendUrl}/app/links`;

    if (error || !code) {
      return res.redirect(`${redirectBase}?youtube=error&reason=${error ?? 'no_code'}`);
    }

    try {
      const userId = Buffer.from(state, 'base64url').toString('utf8');
      const result = await this.youtubeService.exchangeCodeAndSave(code, userId);
      return res.redirect(
        `${redirectBase}?youtube=success&channel=${encodeURIComponent(result.channelTitle ?? '')}`,
      );
    } catch (err: any) {
      console.error('[YouTube OAuth callback error]', err?.message);
      return res.redirect(`${redirectBase}?youtube=error&reason=server`);
    }
  }

  /**
   * Get current YouTube connection status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req: any) {
    const connection = await this.youtubeService.getConnection(req.user.id);
    return { connected: !!connection, connection };
  }

  /**
   * Fetch latest videos from connected channel
   */
  @Get('videos')
  @UseGuards(JwtAuthGuard)
  async getVideos(@Req() req: any, @Query('limit') limit?: string) {
    return this.youtubeService.getLatestVideos(
      req.user.id,
      limit ? parseInt(limit, 10) : 12,
    );
  }

  /**
   * Get video info by URL (public endpoint, uses API key)
   */
  @Get('video-info')
  @UseGuards(JwtAuthGuard)
  async getVideoInfo(@Query('url') url: string) {
    if (!url) throw new Error('URL parameter is required');
    return this.youtubeService.getVideoInfo(url);
  }

  /**
   * Disconnect YouTube account
   */
  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnect(@Req() req: any) {
    return this.youtubeService.disconnect(req.user.id);
  }

  // ─── Block endpoints ─────────────────────────────────────

  /**
   * Create a YouTube block (LATEST_VIDEOS or SINGLE_VIDEO)
   */
  @Post('blocks')
  @UseGuards(JwtAuthGuard)
  async createBlock(
    @Req() req: any,
    @Body() body: { type: 'LATEST_VIDEOS' | 'SINGLE_VIDEO'; videoUrl?: string },
  ) {
    return this.youtubeService.createBlock(req.user.id, body.type, body.videoUrl);
  }

  /**
   * Get all blocks for current user
   */
  @Get('blocks')
  @UseGuards(JwtAuthGuard)
  async getBlocks(@Req() req: any) {
    return this.youtubeService.getBlocks(req.user.id);
  }

  /**
   * Get public blocks + videos for a user (by userId)
   */
  @Get('blocks/public/:userId')
  async getPublicBlocks(@Param('userId') userId: string) {
    const blocks = await this.youtubeService.getActiveBlocks(userId);
    const videos = await this.youtubeService.getPublicVideos(userId);
    return { blocks, videos };
  }

  /**
   * Toggle block active state
   */
  @Patch('blocks/:blockId/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleBlock(@Req() req: any, @Param('blockId') blockId: string) {
    return this.youtubeService.toggleBlock(req.user.id, blockId);
  }

  /**
   * Delete a block
   */
  @Delete('blocks/:blockId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async deleteBlock(@Req() req: any, @Param('blockId') blockId: string) {
    return this.youtubeService.deleteBlock(req.user.id, blockId);
  }
}

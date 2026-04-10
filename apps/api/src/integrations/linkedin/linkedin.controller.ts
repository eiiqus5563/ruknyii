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
import { LinkedInService } from './linkedin.service';
import { JwtAuthGuard } from '../../core/common/guards/auth/jwt-auth.guard';

@Controller('integrations/linkedin')
export class LinkedInController {
  private readonly frontendUrl: string;

  constructor(
    private readonly linkedinService: LinkedInService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl =
      this.config.get<string>('FRONTEND_URL') ||
      this.config.get<string>('FRONTEND_URL_DEV') ||
      'http://localhost:3000';
  }

  /**
   * Start LinkedIn OAuth flow for integration
   * GET /api/v1/integrations/linkedin/auth
   */
  @Get('auth')
  @UseGuards(JwtAuthGuard)
  async authorize(@Req() req: any, @Res() res: Response) {
    const state = Buffer.from(req.user.id).toString('base64url');
    const authUrl = this.linkedinService.getAuthUrl(state);
    return res.redirect(authUrl);
  }

  /**
   * OAuth callback — LinkedIn redirects here with code
   * GET /api/v1/integrations/linkedin/callback?code=xxx&state=xxx
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
      return res.redirect(`${redirectBase}?linkedin=error&reason=${error ?? 'no_code'}`);
    }

    try {
      const userId = Buffer.from(state, 'base64url').toString('utf8');
      const result = await this.linkedinService.exchangeCodeAndSave(code, userId);

      // Auto-create a PROFILE_CARD block if the user doesn't have one yet
      try {
        const existingBlocks = await this.linkedinService.getBlocks(userId);
        if (existingBlocks.length === 0) {
          await this.linkedinService.createBlock(userId, 'PROFILE_CARD');
        }
      } catch {
        // Non-critical — user can create it manually
      }

      return res.redirect(
        `${redirectBase}?linkedin=success&name=${encodeURIComponent(result.name)}`,
      );
    } catch (err: any) {
      console.error('[LinkedIn OAuth callback error]', err?.message);
      return res.redirect(`${redirectBase}?linkedin=error&reason=server`);
    }
  }

  /**
   * Get current LinkedIn connection status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  async getStatus(@Req() req: any) {
    const connection = await this.linkedinService.getConnection(req.user.id);
    return { connected: !!connection, connection };
  }

  /**
   * Disconnect LinkedIn account
   */
  @Delete()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async disconnect(@Req() req: any) {
    return this.linkedinService.disconnect(req.user.id);
  }

  /**
   * Create a LinkedIn block
   * POST /api/v1/integrations/linkedin/blocks
   */
  @Post('blocks')
  @UseGuards(JwtAuthGuard)
  async createBlock(
    @Req() req: any,
    @Body('type') type: 'PROFILE_CARD',
  ) {
    return this.linkedinService.createBlock(req.user.id, type);
  }

  /**
   * Get user's LinkedIn blocks
   */
  @Get('blocks')
  @UseGuards(JwtAuthGuard)
  async getBlocks(@Req() req: any) {
    return this.linkedinService.getBlocks(req.user.id);
  }

  /**
   * Get public LinkedIn data for a user
   */
  @Get('blocks/public/:userId')
  async getPublicBlocks(@Param('userId') userId: string) {
    return this.linkedinService.getPublicData(userId);
  }

  /**
   * Toggle a LinkedIn block's active status
   */
  @Patch('blocks/:blockId/toggle')
  @UseGuards(JwtAuthGuard)
  async toggleBlock(
    @Req() req: any,
    @Param('blockId') blockId: string,
  ) {
    return this.linkedinService.toggleBlock(req.user.id, blockId);
  }

  /**
   * Delete a LinkedIn block
   */
  @Delete('blocks/:blockId')
  @UseGuards(JwtAuthGuard)
  async deleteBlock(
    @Req() req: any,
    @Param('blockId') blockId: string,
  ) {
    return this.linkedinService.deleteBlock(req.user.id, blockId);
  }
}

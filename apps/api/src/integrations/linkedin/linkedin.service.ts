import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma/prisma.service';

const LI_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const LI_TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const LI_USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

@Injectable()
export class LinkedInService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly scopes: string;

  private get linkedinConnectionModel(): any {
    return (this.prisma as any).linkedInConnection;
  }

  private get linkedinBlockModel(): any {
    return (this.prisma as any).linkedInBlock;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.clientId = this.config.get<string>('LINKEDIN_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('LINKEDIN_CLIENT_SECRET') ?? '';
    this.redirectUri = this.config.get<string>('LINKEDIN_INTEGRATION_CALLBACK_URL') ??
      this.config.get<string>('LINKEDIN_CALLBACK_URL') ?? '';
    this.scopes = this.config.get<string>('LINKEDIN_SCOPES') ?? 'openid profile email';
  }

  private ensureConfigured() {
    const missing: string[] = [];
    if (!this.clientId) missing.push('LINKEDIN_CLIENT_ID');
    if (!this.clientSecret) missing.push('LINKEDIN_CLIENT_SECRET');
    if (!this.redirectUri) missing.push('LINKEDIN_INTEGRATION_CALLBACK_URL');
    if (missing.length > 0) {
      throw new BadRequestException(
        `LinkedIn integration is not configured. Missing: ${missing.join(', ')}`,
      );
    }
  }

  /** Build OAuth authorization URL for integration (separate from auth login) */
  getAuthUrl(state: string): string {
    this.ensureConfigured();

    const scopes = this.scopes.replace(/,/g, ' ');

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes,
      state,
    });

    return `${LI_AUTH_URL}?${params.toString()}`;
  }

  /** Exchange authorization code for tokens and save connection */
  async exchangeCodeAndSave(code: string, userId: string) {
    this.ensureConfigured();

    // 1. Exchange code for access token
    const tokenParams = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    });

    const tokenRes = await fetch(LI_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenParams.toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new BadRequestException(`LinkedIn token exchange failed: ${err}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      refresh_token_expires_in?: number;
    };

    // 2. Fetch user profile from OpenID Connect userinfo
    const profileRes = await fetch(LI_USERINFO_URL, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!profileRes.ok) {
      const err = await profileRes.text();
      throw new BadRequestException(`LinkedIn profile fetch failed: ${err}`);
    }

    const profile = (await profileRes.json()) as {
      sub: string;
      name?: string;
      given_name?: string;
      family_name?: string;
      picture?: string;
      email?: string;
    };

    if (!profile.sub) {
      throw new BadRequestException('فشل جلب بيانات حساب LinkedIn.');
    }

    const name = profile.name ||
      `${profile.given_name || ''} ${profile.family_name || ''}`.trim() ||
      'LinkedIn User';

    const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);

    // 3. Upsert connection (OIDC userinfo: name, email, picture, sub)
    await this.linkedinConnectionModel.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenExpiry,
        linkedinSub: profile.sub,
        name,
        email: profile.email ?? null,
        profilePicUrl: profile.picture ?? null,
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenExpiry,
        linkedinSub: profile.sub,
        name,
        email: profile.email ?? null,
        profilePicUrl: profile.picture ?? null,
      },
    });

    return { success: true, name };
  }

  /** Get current connection status for a user */
  async getConnection(userId: string) {
    const conn = await this.linkedinConnectionModel.findUnique({
      where: { userId },
      select: {
        linkedinSub: true,
        name: true,
        email: true,
        profilePicUrl: true,
        profileUrl: true,
        tokenExpiry: true,
        createdAt: true,
      },
    });
    return conn ?? null;
  }

  /** Disconnect LinkedIn account */
  async disconnect(userId: string) {
    await this.linkedinConnectionModel.delete({
      where: { userId },
    });
    return { success: true };
  }

  // ─── LinkedIn Blocks ─────────────────────────────────────────

  /** Create a LinkedIn block (PROFILE_CARD) */
  async createBlock(userId: string, type: 'PROFILE_CARD') {
    // Ensure user has LinkedIn connected
    const conn = await this.linkedinConnectionModel.findUnique({
      where: { userId },
    });
    if (!conn) throw new BadRequestException('يجب ربط حساب LinkedIn أولاً');

    // Get max display order
    const maxOrder = await this.linkedinBlockModel.aggregate({
      where: { userId },
      _max: { displayOrder: true },
    });

    return this.linkedinBlockModel.create({
      data: {
        userId,
        type,
        displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
      },
    });
  }

  /** Get all LinkedIn blocks for a user */
  async getBlocks(userId: string) {
    return this.linkedinBlockModel.findMany({
      where: { userId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /** Get active LinkedIn blocks for a user (public profile) */
  async getActiveBlocks(userId: string) {
    return this.linkedinBlockModel.findMany({
      where: { userId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /** Delete a LinkedIn block */
  async deleteBlock(userId: string, blockId: string) {
    const block = await this.linkedinBlockModel.findFirst({
      where: { id: blockId, userId },
    });
    if (!block) throw new NotFoundException('البلوك غير موجود');

    await this.linkedinBlockModel.delete({ where: { id: blockId } });
    return { success: true };
  }

  /** Toggle block active status */
  async toggleBlock(userId: string, blockId: string) {
    const block = await this.linkedinBlockModel.findFirst({
      where: { id: blockId, userId },
    });
    if (!block) throw new NotFoundException('البلوك غير موجود');

    return this.linkedinBlockModel.update({
      where: { id: blockId },
      data: { isActive: !block.isActive },
    });
  }

  /** Get public LinkedIn data for a user profile */
  async getPublicData(userId: string) {
    const conn = await this.linkedinConnectionModel.findUnique({
      where: { userId },
      select: {
        name: true,
        email: true,
        profilePicUrl: true,
        profileUrl: true,
      },
    });

    const blocks = await this.getActiveBlocks(userId);

    return {
      profile: conn ?? null,
      blocks,
    };
  }
}

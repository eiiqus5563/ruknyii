import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma/prisma.service';

const YT_OAUTH_BASE = 'https://accounts.google.com/o/oauth2/v2/auth';
const YT_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const YT_API_BASE = 'https://www.googleapis.com/youtube/v3';

@Injectable()
export class YouTubeService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly apiKey: string;

  private get youtubeConnectionModel(): any {
    return (this.prisma as any).youTubeConnection;
  }

  private get youtubeBlockModel(): any {
    return (this.prisma as any).youTubeBlock;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.clientId = this.config.get<string>('YOUTUBE_CLIENT_ID') ?? '';
    this.clientSecret = this.config.get<string>('YOUTUBE_CLIENT_SECRET') ?? '';
    this.redirectUri = this.config.get<string>('YOUTUBE_REDIRECT_URI') ?? '';
    this.apiKey = this.config.get<string>('YOUTUBE_API_KEY') ?? '';
  }

  private ensureOAuthConfigured() {
    const missing: string[] = [];
    if (!this.clientId) missing.push('YOUTUBE_CLIENT_ID');
    if (!this.clientSecret) missing.push('YOUTUBE_CLIENT_SECRET');
    if (!this.redirectUri) missing.push('YOUTUBE_REDIRECT_URI');
    if (missing.length > 0) {
      throw new BadRequestException(
        `YouTube OAuth is not configured. Missing: ${missing.join(', ')}`,
      );
    }
  }

  /** Build Google OAuth authorization URL for YouTube */
  getAuthUrl(state: string): string {
    this.ensureOAuthConfigured();

    const scopes = [
      'https://www.googleapis.com/auth/youtube.readonly',
    ].join(' ');

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: scopes,
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    return `${YT_OAUTH_BASE}?${params.toString()}`;
  }

  /** Exchange authorization code for tokens and save connection */
  async exchangeCodeAndSave(code: string, userId: string) {
    this.ensureOAuthConfigured();

    // 1. Exchange code for tokens
    const tokenRes = await fetch(YT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenRes.ok) {
      const err = await tokenRes.text();
      throw new BadRequestException(`YouTube token exchange failed: ${err}`);
    }

    const tokenData = (await tokenRes.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
    };

    // 2. Fetch channel info
    const channelRes = await fetch(
      `${YT_API_BASE}/channels?part=snippet,statistics&mine=true`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );

    if (!channelRes.ok) {
      const err = await channelRes.text();
      throw new BadRequestException(`Failed to fetch YouTube channel: ${err}`);
    }

    const channelData = (await channelRes.json()) as {
      items?: Array<{
        id: string;
        snippet?: {
          title?: string;
          thumbnails?: {
            default?: { url?: string };
            medium?: { url?: string };
            high?: { url?: string };
          };
        };
        statistics?: { subscriberCount?: string };
      }>;
    };

    const channel = channelData.items?.[0];
    if (!channel) {
      throw new BadRequestException('لم يتم العثور على قناة YouTube مرتبطة بهذا الحساب');
    }

    const tokenExpiry = new Date(Date.now() + tokenData.expires_in * 1000);
    const thumbnails = channel.snippet?.thumbnails;
    const channelThumbnail =
      thumbnails?.high?.url ?? thumbnails?.medium?.url ?? thumbnails?.default?.url ?? null;

    // 3. Upsert connection
    await this.youtubeConnectionModel.upsert({
      where: { userId },
      create: {
        userId,
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? null,
        tokenExpiry,
        channelId: channel.id,
        channelTitle: channel.snippet?.title ?? '',
        channelThumbnail,
        subscriberCount: channel.statistics?.subscriberCount
          ? parseInt(channel.statistics.subscriberCount, 10)
          : null,
      },
      update: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? undefined,
        tokenExpiry,
        channelId: channel.id,
        channelTitle: channel.snippet?.title ?? '',
        channelThumbnail,
        subscriberCount: channel.statistics?.subscriberCount
          ? parseInt(channel.statistics.subscriberCount, 10)
          : null,
      },
    });

    return { success: true, channelTitle: channel.snippet?.title };
  }

  /** Refresh expired access token using refresh token */
  async refreshAccessToken(userId: string) {
    const conn = await this.youtubeConnectionModel.findUnique({ where: { userId } });
    if (!conn) throw new NotFoundException('لا يوجد حساب YouTube مرتبط');
    if (!conn.refreshToken) throw new BadRequestException('لا يوجد refresh token');

    const res = await fetch(YT_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: conn.refreshToken,
        grant_type: 'refresh_token',
      }).toString(),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new BadRequestException(`Token refresh failed: ${err}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    const tokenExpiry = new Date(Date.now() + data.expires_in * 1000);

    await this.youtubeConnectionModel.update({
      where: { userId },
      data: { accessToken: data.access_token, tokenExpiry },
    });

    return data.access_token;
  }

  /** Get a valid access token (refreshing if needed) */
  private async getValidToken(userId: string): Promise<string> {
    const conn = await this.youtubeConnectionModel.findUnique({ where: { userId } });
    if (!conn) throw new NotFoundException('لا يوجد حساب YouTube مرتبط');

    if (conn.tokenExpiry && new Date(conn.tokenExpiry) < new Date()) {
      if (conn.refreshToken) {
        return this.refreshAccessToken(userId);
      }
      throw new BadRequestException({
        message: 'انتهت صلاحية توكن YouTube. يرجى إعادة ربط حسابك.',
        tokenExpired: true,
      });
    }

    return conn.accessToken;
  }

  /** Get connection status */
  async getConnection(userId: string) {
    const conn = await this.youtubeConnectionModel.findUnique({
      where: { userId },
      select: {
        channelId: true,
        channelTitle: true,
        channelThumbnail: true,
        subscriberCount: true,
        tokenExpiry: true,
        createdAt: true,
      },
    });
    return conn ?? null;
  }

  /** Disconnect YouTube account */
  async disconnect(userId: string) {
    await this.youtubeConnectionModel.delete({ where: { userId } });
    return { success: true };
  }

  /** Fetch latest videos from connected channel */
  async getLatestVideos(userId: string, limit = 12) {
    const accessToken = await this.getValidToken(userId);
    const conn = await this.youtubeConnectionModel.findUnique({ where: { userId } });

    // Get uploads playlist
    const channelRes = await fetch(
      `${YT_API_BASE}/channels?part=contentDetails&id=${conn.channelId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!channelRes.ok) {
      throw new BadRequestException('فشل جلب بيانات القناة');
    }

    const channelData = await channelRes.json();
    const uploadsPlaylistId =
      channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;

    if (!uploadsPlaylistId) {
      return { items: [] };
    }

    // Get videos from uploads playlist
    const videosRes = await fetch(
      `${YT_API_BASE}/playlistItems?part=snippet,contentDetails&playlistId=${uploadsPlaylistId}&maxResults=${limit}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!videosRes.ok) {
      throw new BadRequestException('فشل جلب الفيديوهات');
    }

    const videosData = await videosRes.json();
    const videoIds = videosData.items
      ?.map((item: any) => item.contentDetails?.videoId)
      .filter(Boolean)
      .join(',');

    if (!videoIds) return { items: [] };

    // Get video statistics and details
    const detailsRes = await fetch(
      `${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoIds}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    if (!detailsRes.ok) return { items: [] };

    const detailsData = await detailsRes.json();
    return {
      items: (detailsData.items ?? []).map((v: any) => ({
        id: v.id,
        title: v.snippet?.title,
        description: v.snippet?.description,
        thumbnail: v.snippet?.thumbnails?.high?.url ?? v.snippet?.thumbnails?.medium?.url,
        publishedAt: v.snippet?.publishedAt,
        viewCount: v.statistics?.viewCount,
        likeCount: v.statistics?.likeCount,
        duration: v.contentDetails?.duration,
        url: `https://www.youtube.com/watch?v=${v.id}`,
      })),
    };
  }

  /** Fetch video info by URL (public, uses API key) */
  async getVideoInfo(videoUrl: string) {
    const videoId = this.extractVideoId(videoUrl);
    if (!videoId) throw new BadRequestException('رابط فيديو YouTube غير صالح');

    const apiKeyOrToken = this.apiKey;
    if (!apiKeyOrToken) {
      throw new BadRequestException('YouTube API Key غير مُعد');
    }

    const res = await fetch(
      `${YT_API_BASE}/videos?part=snippet,statistics,contentDetails&id=${videoId}&key=${apiKeyOrToken}`,
    );

    if (!res.ok) {
      throw new BadRequestException('فشل جلب بيانات الفيديو');
    }

    const data = await res.json();
    const video = data.items?.[0];
    if (!video) throw new NotFoundException('الفيديو غير موجود');

    return {
      id: video.id,
      title: video.snippet?.title,
      description: video.snippet?.description,
      thumbnail: video.snippet?.thumbnails?.high?.url ?? video.snippet?.thumbnails?.medium?.url,
      channelTitle: video.snippet?.channelTitle,
      publishedAt: video.snippet?.publishedAt,
      viewCount: video.statistics?.viewCount,
      likeCount: video.statistics?.likeCount,
      duration: video.contentDetails?.duration,
      url: `https://www.youtube.com/watch?v=${video.id}`,
    };
  }

  /** Fetch public videos for display (uses stored token) */
  async getPublicVideos(userId: string, limit = 6) {
    const conn = await this.youtubeConnectionModel.findUnique({ where: { userId } });
    if (!conn) return null;

    if (conn.tokenExpiry && new Date(conn.tokenExpiry) < new Date()) {
      // Try refreshing
      if (conn.refreshToken) {
        try {
          await this.refreshAccessToken(userId);
          return this.getLatestVideos(userId, limit);
        } catch {
          return null;
        }
      }
      return null;
    }

    try {
      return this.getLatestVideos(userId, limit);
    } catch {
      return null;
    }
  }

  /** Extract video ID from various YouTube URL formats */
  private extractVideoId(url: string): string | null {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  // ─── YouTube Blocks ───────────────────────────────────────

  /** Create a YouTube block */
  async createBlock(
    userId: string,
    type: 'LATEST_VIDEOS' | 'SINGLE_VIDEO',
    videoUrl?: string,
  ) {
    if (type === 'LATEST_VIDEOS') {
      // Ensure user has YouTube connected
      const conn = await this.youtubeConnectionModel.findUnique({ where: { userId } });
      if (!conn) throw new BadRequestException('يجب ربط حساب YouTube أولاً');
    }

    const videoId = videoUrl ? this.extractVideoId(videoUrl) : null;

    const maxOrder = await this.youtubeBlockModel.aggregate({
      where: { userId },
      _max: { displayOrder: true },
    });

    return this.youtubeBlockModel.create({
      data: {
        userId,
        type,
        videoUrl: videoUrl ?? null,
        videoId,
        displayOrder: (maxOrder._max.displayOrder ?? -1) + 1,
      },
    });
  }

  /** Get all YouTube blocks for a user */
  async getBlocks(userId: string) {
    return this.youtubeBlockModel.findMany({
      where: { userId },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /** Get active YouTube blocks for a user (public profile) */
  async getActiveBlocks(userId: string) {
    return this.youtubeBlockModel.findMany({
      where: { userId, isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
  }

  /** Toggle block active status */
  async toggleBlock(userId: string, blockId: string) {
    const block = await this.youtubeBlockModel.findFirst({
      where: { id: blockId, userId },
    });
    if (!block) throw new NotFoundException('البلوك غير موجود');

    return this.youtubeBlockModel.update({
      where: { id: blockId },
      data: { isActive: !block.isActive },
    });
  }

  /** Delete a YouTube block */
  async deleteBlock(userId: string, blockId: string) {
    const block = await this.youtubeBlockModel.findFirst({
      where: { id: blockId, userId },
    });
    if (!block) throw new NotFoundException('البلوك غير موجود');

    await this.youtubeBlockModel.delete({ where: { id: blockId } });
    return { success: true };
  }
}

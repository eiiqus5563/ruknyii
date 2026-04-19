import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { CacheManager } from '../../core/cache/cache.manager';
import { CreateProfileDto, UpdateProfileDto } from './dto';
import { S3Service } from '../../shared/services/s3.service';

@Injectable()
export class ProfilesService {
  private readonly bucket = process.env.S3_BUCKET || 'rukny-storage';
  private readonly logger = new Logger(ProfilesService.name);

  constructor(
    private prisma: PrismaService,
    private s3Service: S3Service,
    private readonly cacheManager: CacheManager,
  ) {}

  /**
   * Helper to serialize BigInt fields to numbers for JSON response
   */
  private serializeProfile<
    T extends { storageUsed?: bigint | number; storageLimit?: bigint | number },
  >(profile: T): T & { storageUsed: number; storageLimit: number } {
    return {
      ...profile,
      storageUsed: Number(profile.storageUsed || 0),
      storageLimit: Number(profile.storageLimit || 0),
    };
  }

  /**
   * Convert heroSettings logoCloud S3 keys to presigned URLs
   */
  private extractS3KeyFromUrl(url: string): string | null {
    try {
      const parsed = new URL(url);
      let key = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));

      // Handle path-style URLs: /bucket/key
      if (key.startsWith(`${this.bucket}/`)) {
        key = key.slice(this.bucket.length + 1);
      }

      return key || null;
    } catch {
      return null;
    }
  }

  private async resolveLogoUrls(heroSettings: any): Promise<any> {
    if (!heroSettings?.logoCloud?.logos?.length) return heroSettings;
    try {
      const logos = heroSettings.logoCloud.logos;
      const resolvedLogos = logos.map((logo: any) => {
          const keyFromLogoKey =
            typeof logo?.key === 'string' && logo.key && !logo.key.startsWith('http')
              ? logo.key
              : null;
          const keyFromSrc =
            typeof logo?.src === 'string' && logo.src && !logo.src.startsWith('http')
              ? logo.src
              : null;
          const keyFromS3Url =
            typeof logo?.src === 'string' && logo.src.startsWith('http')
              ? this.extractS3KeyFromUrl(logo.src)
              : null;

          const sourceKey = keyFromLogoKey || keyFromSrc || keyFromS3Url;

          if (sourceKey) {
            return { ...logo, key: sourceKey, src: `/api/media/${sourceKey}` };
          }
          return logo;
        });
      return {
        ...heroSettings,
        logoCloud: { ...heroSettings.logoCloud, logos: resolvedLogos },
      };
    } catch {
      return heroSettings;
    }
  }

  /**
   * Create a new user profile
   */
  async create(userId: string, createProfileDto: CreateProfileDto) {
    // Check if username already exists
    const existingProfile = await this.prisma.profile.findUnique({
      where: { username: createProfileDto.username },
    });

    if (existingProfile) {
      throw new ConflictException(
        `Username "${createProfileDto.username}" is already taken`,
      );
    }

    // Check if user already has a profile
    const userProfile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (userProfile) {
      throw new ConflictException('User already has a profile');
    }

    // Create the profile
    const profile = await this.prisma.profile.create({
      data: {
        username: createProfileDto.username,
        bio: createProfileDto.bio,
        visibility: createProfileDto.visibility,
        name: createProfileDto.name,
        user: {
          connect: { id: userId },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        socialLinks: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    return this.serializeProfile(profile);
  }

  /**
   * Find profile by username
   * ⚡ Performance: Cached for 5 minutes
   */
  async findByUsername(username: string, requesterId?: string) {
    const cacheKey = `profile:username:${username}`;

    return this.cacheManager.wrap(cacheKey, 300, async () => {
      const profile = await this.prisma.profile.findUnique({
        where: { username },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              bannerUrls: true,
            },
          },
          socialLinks: {
            where: { status: 'active' },
            orderBy: { displayOrder: 'asc' },
          },
        },
      });

      if (!profile) {
        throw new NotFoundException(
          `Profile with username "${username}" not found`,
        );
      }

      // Don't return email if profile is private and not the owner
      if (profile.visibility === 'PRIVATE' && profile.userId !== requesterId) {
        delete profile.user.email;
      }

      // Respect privacy settings for non-owners
      if (profile.userId !== requesterId) {
        if ((profile as any).hideEmail) {
          delete profile.user.email;
        }
      }

      // Get follow counts separately
      const [followersCount, followingCount] = await Promise.all([
        this.prisma.follows.count({
          where: { followingId: profile.userId },
        }),
        this.prisma.follows.count({
          where: { followerId: profile.userId },
        }),
      ]);

      // Convert banner keys to stable proxy URLs
      const bannerKeys = (profile.user.bannerUrls || []).filter(
        (key: string) => key && !key.startsWith('http'),
      );
      const bannerUrls = bannerKeys.map((key: string) => `/api/media/${key}`);

      // Convert avatar and cover keys to stable proxy URLs
      let avatarUrl = (profile as any).avatar as string | undefined | null;
      let coverUrl = (profile as any).coverImage as string | undefined | null;

      // Handle legacy local paths (convert to full API URL or clear if invalid)
      const apiBaseUrl = process.env.API_BASE_URL || 'http://localhost:3001';
      
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        if (avatarUrl.startsWith('/uploads/')) {
          this.logger.warn(`Legacy local avatar path detected for user, clearing: ${avatarUrl}`);
          avatarUrl = null;
        } else {
          avatarUrl = `/api/media/${avatarUrl}`;
        }
      }

      if (coverUrl && !coverUrl.startsWith('http')) {
        if (coverUrl.startsWith('/uploads/')) {
          this.logger.warn(`Legacy local cover path detected for user, clearing: ${coverUrl}`);
          coverUrl = null;
        } else {
          coverUrl = `/api/media/${coverUrl}`;
        }
      }

      // Resolve logo cloud URLs in heroSettings
      const resolvedHeroSettings = await this.resolveLogoUrls(
        (profile as any).heroSettings,
      );

      // Transform response to include _count and banners at profile level
      return this.serializeProfile({
        ...profile,
        avatar: avatarUrl,
        coverImage: coverUrl,
        banners: bannerUrls,
        heroSettings: resolvedHeroSettings,
        _count: {
          followers: followersCount,
          following: followingCount,
        },
      });
    });
  }

  /**
   * Find profile by user ID
   */
  async findByUserId(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            phone: true,
            twoFactorEnabled: true,
            googleId: true,
            linkedinId: true,
            isDeactivated: true,
            deactivatedAt: true,
          },
        },
        socialLinks: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    // Convert avatar/cover to stable proxy URLs
    try {
      let avatarUrl = (profile as any)?.avatar;
      let coverUrl = (profile as any)?.coverImage;
      
      // Handle legacy local paths - clear them since files don't exist
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        if (avatarUrl.startsWith('/uploads/')) {
          this.logger.warn(`Legacy local avatar path detected, clearing: ${avatarUrl}`);
          avatarUrl = null;
        } else {
          avatarUrl = `/api/media/${avatarUrl}`;
        }
      }
      if (coverUrl && !coverUrl.startsWith('http')) {
        if (coverUrl.startsWith('/uploads/')) {
          this.logger.warn(`Legacy local cover path detected, clearing: ${coverUrl}`);
          coverUrl = null;
        } else {
          coverUrl = `/api/media/${coverUrl}`;
        }
      }
      const resolvedHeroSettings = await this.resolveLogoUrls(
        (profile as any).heroSettings,
      );
      return this.serializeProfile({
        ...profile,
        avatar: avatarUrl,
        coverImage: coverUrl,
        heroSettings: resolvedHeroSettings,
      });
    } catch (e) {
      return this.serializeProfile(profile);
    }
  }

  /**
   * Update user profile
   */
  async update(userId: string, updateProfileDto: UpdateProfileDto) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        'Profile not found. Please create a profile first.',
      );
    }

    // Check username uniqueness if updating username
    if (
      updateProfileDto.username &&
      updateProfileDto.username !== profile.username
    ) {
      const existingProfile = await this.prisma.profile.findUnique({
        where: { username: updateProfileDto.username },
      });

      if (existingProfile) {
        throw new ConflictException(
          `Username "${updateProfileDto.username}" is already taken`,
        );
      }
    }

    // Update the profile
    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: updateProfileDto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        socialLinks: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    // Invalidate cached public profile
    const cacheKey = `profile:username:${updatedProfile.username}`;
    await this.cacheManager.invalidate(cacheKey);

    return this.serializeProfile(updatedProfile);
  }

  /**
   * Upload profile avatar
   */
  async uploadAvatar(userId: string, fileName: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        'Profile not found. Please create a profile first.',
      );
    }

    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: { avatar: fileName },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    await this.cacheManager.invalidate(`profile:username:${profile.username}`);
    return this.serializeProfile(updatedProfile);
  }

  /**
   * Upload cover image
   */
  async uploadCover(userId: string, fileName: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException(
        'Profile not found. Please create a profile first.',
      );
    }

    const updatedProfile = await this.prisma.profile.update({
      where: { userId },
      data: { coverImage: fileName },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    await this.cacheManager.invalidate(`profile:username:${profile.username}`);
    return this.serializeProfile(updatedProfile);
  }

  /**
   * Delete user profile
   */
  async remove(userId: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Profile not found');
    }

    await this.prisma.profile.delete({
      where: { userId },
    });

    return { message: 'Profile deleted successfully' };
  }

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(username: string) {
    const profile = await this.prisma.profile.findUnique({
      where: { username },
    });

    return {
      username,
      available: !profile,
    };
  }
}

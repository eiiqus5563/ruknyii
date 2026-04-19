import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { RedisService } from '../../../core/cache/redis.service';
import { ConfigService } from '@nestjs/config';
import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';
import { DEVELOPER_PLAN_LIMITS } from '../subscriptions/dev-plan-limits.config';

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name);
  private readonly ENCRYPTION_KEY: Buffer;
  private readonly ENCRYPTION_ALGORITHM = 'aes-256-gcm';

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private configService: ConfigService,
  ) {
    const key = this.configService.get<string>('TWO_FACTOR_ENCRYPTION_KEY');
    if (key && /^[0-9a-fA-F]{64}$/.test(key)) {
      this.ENCRYPTION_KEY = Buffer.from(key, 'hex');
    } else if (key && key.length >= 32) {
      this.ENCRYPTION_KEY = Buffer.from(key.substring(0, 32), 'utf8');
    } else {
      this.ENCRYPTION_KEY = Buffer.alloc(0);
      this.logger.warn('TWO_FACTOR_ENCRYPTION_KEY not set — API key reveal will be unavailable');
    }
  }

  private encryptKey(text: string): string {
    if (this.ENCRYPTION_KEY.length === 0) return '';
    const iv = randomBytes(16);
    const cipher = createCipheriv(this.ENCRYPTION_ALGORITHM, this.ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  private decryptKey(encryptedText: string): string {
    if (!encryptedText) throw new NotFoundException('المفتاح المشفّر غير متوفر');
    const parts = encryptedText.split(':');
    if (parts.length !== 3) throw new NotFoundException('تنسيق المفتاح المشفّر غير صالح');
    const [ivHex, authTagHex, encrypted] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv(this.ENCRYPTION_ALGORITHM, this.ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  /**
   * توليد slug فريد من 6 أرقام
   */
  private async generateUniqueSlug(): Promise<string> {
    for (let i = 0; i < 10; i++) {
      const slug = String(Math.floor(100000 + Math.random() * 900000));
      const exists = await this.prisma.developerApiKey.findUnique({ where: { slug } });
      if (!exists) return slug;
    }
    // fallback: 8 digits
    return String(Math.floor(10000000 + Math.random() * 90000000));
  }

  /**
   * إنشاء مفتاح API جديد
   * يُعاد المفتاح الكامل مرة واحدة فقط
   */
  async create(userId: string, dto: CreateApiKeyDto) {
    // التحقق من أن التطبيق ينتمي للمستخدم
    const app = await this.prisma.developerApp.findFirst({
      where: { id: dto.developerAppId, userId, status: 'ACTIVE' },
    });
    if (!app) throw new NotFoundException('App not found');

    // التحقق من حدود الخطة
    await this.checkApiKeyLimit(userId);

    const environment = dto.environment || 'live';
    const prefix = environment === 'live' ? 'rk_live_' : 'rk_test_';

    // توليد المفتاح
    const rawKey = prefix + randomBytes(32).toString('hex');
    const keyHash = this.hashKey(rawKey);
    const keyPrefix = rawKey.substring(0, prefix.length + 4); // rk_live_xxxx
    const keySuffix = rawKey.substring(rawKey.length - 4);

    const slug = await this.generateUniqueSlug();

    const apiKey = await this.prisma.developerApiKey.create({
      data: {
        userId,
        slug,
        developerAppId: dto.developerAppId,
        name: dto.name,
        keyPrefix,
        keySuffix,
        keyHash,
        encryptedKey: this.ENCRYPTION_KEY.length > 0 ? this.encryptKey(rawKey) : null,
        scopes: dto.scopes || [
          'whatsapp:send',
          'whatsapp:read',
          'templates:read',
          'contacts:read',
        ],
        environment,
        ipAllowlist: dto.ipAllowlist || [],
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });

    this.logger.log(`API key created: ${apiKey.id} for user ${userId}`);

    return {
      id: apiKey.id,
      slug: apiKey.slug,
      name: apiKey.name,
      key: rawKey, // يُعرض مرة واحدة فقط!
      keyPrefix: apiKey.keyPrefix,
      keySuffix: apiKey.keySuffix,
      scopes: apiKey.scopes,
      environment: apiKey.environment,
      ipAllowlist: apiKey.ipAllowlist,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * قائمة مفاتيح API للمستخدم
   */
  async findAll(userId: string, developerAppId?: string) {
    const keys = await this.prisma.developerApiKey.findMany({
      where: { userId, ...(developerAppId ? { developerAppId } : {}) },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        slug: true,
        name: true,
        keyPrefix: true,
        keySuffix: true,
        scopes: true,
        environment: true,
        status: true,
        lastUsedAt: true,
        expiresAt: true,
        ipAllowlist: true,
        requestCount: true,
        createdAt: true,
      },
    });
    return keys;
  }

  /**
   * تحديث مفتاح API
   */
  async update(userId: string, keySlug: string, dto: UpdateApiKeyDto) {
    const key = await this.prisma.developerApiKey.findFirst({
      where: { slug: keySlug, userId },
    });
    if (!key) throw new NotFoundException('API key not found');

    const updated = await this.prisma.developerApiKey.update({
      where: { id: key.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.scopes && { scopes: dto.scopes }),
        ...(dto.ipAllowlist && { ipAllowlist: dto.ipAllowlist }),
      },
      select: {
        id: true,
        slug: true,
        name: true,
        keyPrefix: true,
        keySuffix: true,
        scopes: true,
        environment: true,
        status: true,
        ipAllowlist: true,
        updatedAt: true,
      },
    });

    // حذف الكاش
    await this.redis.del(`apikey:${key.keyHash}`);

    return updated;
  }

  /**
   * إلغاء مفتاح API
   */
  async revoke(userId: string, keySlug: string) {
    const key = await this.prisma.developerApiKey.findFirst({
      where: { slug: keySlug, userId },
    });
    if (!key) throw new NotFoundException('API key not found');

    await this.prisma.developerApiKey.update({
      where: { id: key.id },
      data: { status: 'REVOKED' },
    });

    // حذف الكاش
    await this.redis.del(`apikey:${key.keyHash}`);

    this.logger.log(`API key revoked: ${key.slug} by user ${userId}`);

    return { success: true };
  }

  /**
   * كشف المفتاح الكامل (يتطلب تحقق ثنائي مسبق)
   */
  async revealKey(userId: string, keySlug: string) {
    const key = await this.prisma.developerApiKey.findFirst({
      where: { slug: keySlug, userId },
      select: { id: true, name: true, encryptedKey: true, status: true },
    });
    if (!key) throw new NotFoundException('API key not found');
    if (key.status !== 'ACTIVE') throw new ForbiddenException('لا يمكن كشف مفتاح ملغي أو منتهي');
    if (!key.encryptedKey) throw new NotFoundException('المفتاح المشفّر غير متوفر — أنشئ مفتاحاً جديداً');

    const rawKey = this.decryptKey(key.encryptedKey);
    return { key: rawKey };
  }

  /**
   * التحقق من مفتاح API (يُستخدم من ApiKeyAuthGuard)
   * النتيجة تُخزّن مؤقتاً في Redis
   */
  async validateKey(rawKey: string) {
    const keyHash = this.hashKey(rawKey);

    // تحقق من الكاش أولاً
    const cached = await this.redis.get<{
      id: string;
      userId: string;
      developerAppId: string | null;
      scopes: string[];
      environment: string;
      ipAllowlist: string[];
    }>(`apikey:${keyHash}`);

    if (cached) return cached;

    // البحث في قاعدة البيانات
    const apiKey = await this.prisma.developerApiKey.findUnique({
      where: { keyHash },
      select: {
        id: true,
        userId: true,
        developerAppId: true,
        scopes: true,
        environment: true,
        status: true,
        ipAllowlist: true,
        expiresAt: true,
      },
    });

    if (!apiKey) return null;
    if (apiKey.status !== 'ACTIVE') return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    const result = {
      id: apiKey.id,
      userId: apiKey.userId,
      developerAppId: apiKey.developerAppId,
      scopes: apiKey.scopes,
      environment: apiKey.environment,
      ipAllowlist: apiKey.ipAllowlist,
    };

    // تخزين مؤقت لمدة 5 دقائق
    await this.redis.set(`apikey:${keyHash}`, result, 300);

    // تحديث وقت آخر استخدام (بدون انتظار)
    this.prisma.developerApiKey
      .update({
        where: { keyHash },
        data: {
          lastUsedAt: new Date(),
          requestCount: { increment: 1 },
        },
      })
      .catch(() => {});

    return result;
  }

  /**
   * SHA-256 hash للمفتاح
   */
  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  /**
   * التحقق من حدود API Keys حسب الخطة
   */
  private async checkApiKeyLimit(userId: string) {
    const subscription = await this.prisma.developerSubscription.findUnique({
      where: { userId },
      select: { plan: true },
    });

    const plan = subscription?.plan || 'FREE';
    const limits = DEVELOPER_PLAN_LIMITS[plan];

    const currentCount = await this.prisma.developerApiKey.count({
      where: { userId, status: 'ACTIVE' },
    });

    if (currentCount >= limits.maxApiKeys) {
      throw new ForbiddenException(
        `API key limit reached (${limits.maxApiKeys}). Upgrade your plan for more.`,
      );
    }
  }
}

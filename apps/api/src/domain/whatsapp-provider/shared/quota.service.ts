import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { RedisService } from '../../../core/cache/redis.service';
import { DEVELOPER_PLAN_LIMITS } from '../../developer/subscriptions/dev-plan-limits.config';

/**
 * 📊 خدمة التحقق من الحصص
 *
 * تتحقق من حدود المطوّر قبل كل عملية:
 * - عدد الرسائل الشهرية
 * - عدد الأرقام
 * - Rate limit
 */
@Injectable()
export class QuotaService {
  private readonly logger = new Logger(QuotaService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * التحقق من حصة الرسائل
   */
  async checkMessageQuota(userId: string): Promise<boolean> {
    const subscription = await this.prisma.developerSubscription.findUnique({
      where: { userId },
    });

    if (!subscription) return false;

    const limits = DEVELOPER_PLAN_LIMITS[subscription.plan];
    if (limits.maxMessagesPerMonth === -1) return true; // unlimited

    return subscription.messagesUsed < limits.maxMessagesPerMonth;
  }

  /**
   * زيادة عداد الرسائل
   */
  async incrementMessageCount(userId: string) {
    await this.prisma.developerSubscription.update({
      where: { userId },
      data: { messagesUsed: { increment: 1 } },
    });
  }

  /**
   * التحقق من Rate Limit لـ API Key
   */
  async checkRateLimit(userId: string, apiKeyId: string): Promise<boolean> {
    const subscription = await this.prisma.developerSubscription.findUnique({
      where: { userId },
      select: { rateLimitPerMinute: true },
    });

    const rateLimit = subscription?.rateLimitPerMinute || 30;
    const key = `ratelimit:${apiKeyId}`;

    const current = await this.redis.get<number>(key);
    if (current !== null && current !== undefined && current >= rateLimit) {
      return false;
    }

    // Increment counter with 60s TTL
    const pipeline = await this.redis.getClient();
    if (pipeline) {
      const multi = pipeline.multi();
      multi.incr(key);
      multi.expire(key, 60);
      await multi.exec();
    }

    return true;
  }

  /**
   * التحقق من حد مورد محدد ورمي استثناء
   */
  async enforceQuota(
    userId: string,
    resource: 'messages' | 'phoneNumbers',
  ) {
    if (resource === 'messages') {
      const allowed = await this.checkMessageQuota(userId);
      if (!allowed) {
        throw new ForbiddenException(
          'Monthly message quota exceeded. Please upgrade your plan or wait for the next billing period.',
        );
      }
    }

    if (resource === 'phoneNumbers') {
      const subscription = await this.prisma.developerSubscription.findUnique({
        where: { userId },
      });
      const limits = DEVELOPER_PLAN_LIMITS[subscription?.plan || 'FREE'];
      const count = await this.prisma.developerPhoneNumber.count({
        where: { account: { userId }, status: { not: 'BANNED' } },
      });
      if (count >= limits.maxPhoneNumbers) {
        throw new ForbiddenException(
          `Phone number limit reached (${limits.maxPhoneNumbers}). Upgrade your plan.`,
        );
      }
    }
  }
}

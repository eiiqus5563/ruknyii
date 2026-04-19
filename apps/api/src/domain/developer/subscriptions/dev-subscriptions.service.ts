import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { RedisService } from '../../../core/cache/redis.service';
import { DEVELOPER_PLAN_LIMITS, DeveloperPlanLimits } from './dev-plan-limits.config';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';

/**
 * أسعار الخطط بالدينار العراقي (IQD)
 */
const PLAN_PRICES: Record<string, { monthly: number; yearly: number }> = {
  FREE: { monthly: 0, yearly: 0 },
  STARTER: { monthly: 43500, yearly: 435000 }, // ~$29/شهر
  GROWTH: { monthly: 148500, yearly: 1485000 }, // ~$99/شهر
  ENTERPRISE: { monthly: 0, yearly: 0 }, // مخصص — يتواصل مع المبيعات
};

@Injectable()
export class DevSubscriptionsService {
  private readonly logger = new Logger(DevSubscriptionsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * الحصول على الاشتراك الحالي + إنشاء FREE تلقائياً
   */
  async getSubscription(userId: string) {
    let subscription = await this.prisma.developerSubscription.findUnique({
      where: { userId },
      include: {
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
      },
    });

    // إن لم يوجد، أنشئ اشتراك مجاني
    if (!subscription) {
      subscription = await this.prisma.developerSubscription.create({
        data: {
          userId,
          plan: 'FREE',
          status: 'ACTIVE',
          messagesLimit: DEVELOPER_PLAN_LIMITS.FREE.maxMessagesPerMonth,
          apiKeysLimit: DEVELOPER_PLAN_LIMITS.FREE.maxApiKeys,
          phoneNumbersLimit: DEVELOPER_PLAN_LIMITS.FREE.maxPhoneNumbers,
          webhooksLimit: DEVELOPER_PLAN_LIMITS.FREE.maxWebhooks,
          contactsLimit: DEVELOPER_PLAN_LIMITS.FREE.maxContacts,
          rateLimitPerMinute: DEVELOPER_PLAN_LIMITS.FREE.rateLimitPerMinute,
          logRetentionDays: DEVELOPER_PLAN_LIMITS.FREE.logRetentionDays,
        },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
      });
    }

    return subscription;
  }

  /**
   * الحصول على الخطط المتاحة + الأسعار
   */
  getAvailablePlans() {
    return Object.entries(DEVELOPER_PLAN_LIMITS).map(([plan, limits]) => ({
      plan,
      limits,
      pricing: PLAN_PRICES[plan],
    }));
  }

  /**
   * ترقية الخطة
   */
  async upgradePlan(userId: string, dto: UpgradePlanDto) {
    const subscription = await this.getSubscription(userId);

    if (subscription.plan === dto.plan) {
      throw new ForbiddenException('You are already on this plan');
    }

    // حساب التكلفة
    const cycle = dto.billingCycle || 'monthly';
    const price = PLAN_PRICES[dto.plan]?.[cycle];

    if (price === undefined) {
      throw new ForbiddenException('Invalid plan');
    }

    if (dto.plan === 'ENTERPRISE') {
      // Enterprise يحتاج تواصل خاص
      return { requiresContact: true, message: 'Please contact sales for Enterprise plan' };
    }

    const limits = DEVELOPER_PLAN_LIMITS[dto.plan];
    const now = new Date();
    const periodEnd = new Date(now);
    if (cycle === 'monthly') {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // تحديث الاشتراك
    const updated = await this.prisma.developerSubscription.update({
      where: { userId },
      data: {
        plan: dto.plan as any,
        billingCycle: cycle === 'monthly' ? 'MONTHLY' : 'YEARLY',
        status: 'ACTIVE',
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd,
        messagesLimit: limits.maxMessagesPerMonth,
        apiKeysLimit: limits.maxApiKeys,
        phoneNumbersLimit: limits.maxPhoneNumbers,
        webhooksLimit: limits.maxWebhooks,
        contactsLimit: limits.maxContacts,
        rateLimitPerMinute: limits.rateLimitPerMinute,
        logRetentionDays: limits.logRetentionDays,
      },
    });

    // إنشاء سجل دفع
    await this.prisma.developerPayment.create({
      data: {
        subscriptionId: updated.id,
        amount: price,
        type: 'SUBSCRIPTION',
        status: 'COMPLETED',
        paymentMethod: dto.paymentMethod,
        paidAt: now,
      },
    });

    // مسح الكاش
    await this.redis.del(`devsub:${userId}`);

    this.logger.log(`User ${userId} upgraded to ${dto.plan}`);

    return updated;
  }

  /**
   * الحصول على حدود الخطة (مع كاش)
   */
  async getPlanLimits(userId: string): Promise<DeveloperPlanLimits> {
    const cached = await this.redis.get<DeveloperPlanLimits>(`devsub:${userId}`);
    if (cached) return cached;

    const subscription = await this.getSubscription(userId);
    const limits = DEVELOPER_PLAN_LIMITS[subscription.plan] || DEVELOPER_PLAN_LIMITS.FREE;

    await this.redis.set(`devsub:${userId}`, limits, 300);
    return limits;
  }

  /**
   * التحقق من حد مورد معيّن
   */
  async checkResourceLimit(
    userId: string,
    resource: 'messages' | 'apiKeys' | 'phoneNumbers' | 'webhooks' | 'contacts',
  ) {
    const subscription = await this.getSubscription(userId);
    const limits = DEVELOPER_PLAN_LIMITS[subscription.plan] || DEVELOPER_PLAN_LIMITS.FREE;

    const resourceMap: Record<string, { used: number; max: number }> = {
      messages: { used: subscription.messagesUsed, max: limits.maxMessagesPerMonth },
      apiKeys: { used: subscription.apiKeysUsed, max: limits.maxApiKeys },
      phoneNumbers: { used: subscription.phoneNumbersUsed, max: limits.maxPhoneNumbers },
      webhooks: { used: subscription.webhooksUsed, max: limits.maxWebhooks },
      contacts: { used: subscription.contactsUsed, max: limits.maxContacts },
    };

    const check = resourceMap[resource];
    if (!check) return true;
    if (check.max === -1) return true; // unlimited

    return check.used < check.max;
  }
}

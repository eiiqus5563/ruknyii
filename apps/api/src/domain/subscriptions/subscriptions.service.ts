import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  SubscriptionPlan,
  SubscriptionStatus,
  BillingCycle,
  PaymentStatus,
} from '@prisma/client';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { RedisService } from '../../core/cache/redis.service';
import {
  PLAN_LIMITS,
  PLAN_PRICES,
  PLAN_ORDER,
  PlanLimits,
} from './plan-limits.config';

@Injectable()
export class SubscriptionsService {
  private readonly CACHE_PREFIX = 'sub:';
  private readonly CACHE_TTL = 300; // 5 دقائق

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * جلب باقة المستخدم الحالية (مع تخزين مؤقت)
   */
  async getUserPlan(userId: string): Promise<SubscriptionPlan> {
    // 1. تحقق من الكاش
    const cached = await this.redis
      .get(`${this.CACHE_PREFIX}${userId}`)
      .catch(() => null);
    if (cached) return cached as SubscriptionPlan;

    // 2. جلب من قاعدة البيانات
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
      select: { plan: true, status: true, currentPeriodEnd: true },
    });

    let plan: SubscriptionPlan = 'FREE';

    if (subscription) {
      // تحقق من انتهاء الصلاحية
      if (
        subscription.status === 'ACTIVE' &&
        (!subscription.currentPeriodEnd ||
          subscription.currentPeriodEnd > new Date())
      ) {
        plan = subscription.plan;
      } else if (
        subscription.currentPeriodEnd &&
        subscription.currentPeriodEnd <= new Date() &&
        subscription.status === 'ACTIVE'
      ) {
        // الاشتراك انتهى — حدّث الحالة
        await this.prisma.subscription.update({
          where: { userId },
          data: { status: 'EXPIRED' },
        });
        plan = 'FREE';
      }
    }

    // 3. خزّن في الكاش
    await this.redis
      .set(`${this.CACHE_PREFIX}${userId}`, plan, this.CACHE_TTL)
      .catch(() => {});

    return plan;
  }

  /**
   * جلب حدود الباقة الحالية للمستخدم
   */
  async getUserLimits(userId: string): Promise<PlanLimits> {
    const plan = await this.getUserPlan(userId);
    return PLAN_LIMITS[plan];
  }

  /**
   * جلب تفاصيل اشتراك المستخدم الكاملة
   */
  async getSubscriptionDetails(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const plan = subscription?.plan ?? 'FREE';
    const limits = PLAN_LIMITS[plan];

    return {
      plan,
      status: subscription?.status ?? 'ACTIVE',
      billingCycle: subscription?.billingCycle ?? null,
      currentPeriodStart: subscription?.currentPeriodStart ?? null,
      currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      cancelledAt: subscription?.cancelledAt ?? null,
      limits,
    };
  }

  /**
   * جلب استخدام المستخدم الحالي (كم استخدم من الحدود)
   */
  async getUsageSummary(userId: string) {
    const plan = await this.getUserPlan(userId);
    const limits = PLAN_LIMITS[plan];

    // جلب الإحصائيات بشكل متوازي
    const [
      linksCount,
      formsCount,
      productsCount,
      categoriesCount,
      couponsCount,
      linkGroupsCount,
      storageUsed,
      sessionsCount,
    ] = await Promise.all([
      this.prisma.socialLink.count({
        where: { profile: { userId } },
      }),
      this.prisma.form.count({
        where: { userId },
      }),
      this.prisma.products.count({
        where: { stores: { userId }, status: { not: 'INACTIVE' } },
      }),
      this.prisma.product_categories.count({
        where: { stores: { userId } },
      }),
      this.prisma.coupons.count({
        where: { stores: { userId } },
      }),
      this.prisma.linkGroup.count({
        where: { profile: { userId } },
      }),
      this.prisma.profile
        .findUnique({
          where: { userId },
          select: { storageUsed: true },
        })
        .then((p) => Number(p?.storageUsed ?? 0)),
      this.prisma.session.count({
        where: { userId, isRevoked: false },
      }),
    ]);

    // حساب الإرسالات هذا الشهر
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const submissionsThisMonth = await this.prisma.form_submissions.count({
      where: {
        form: { userId },
        createdAt: { gte: startOfMonth },
      },
    });

    // حساب المنشورات اليوم
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const postsToday = await this.prisma.posts.count({
      where: {
        userId,
        createdAt: { gte: startOfDay },
      },
    });

    return {
      plan,
      usage: {
        links: { used: linksCount, limit: limits.links },
        forms: { used: formsCount, limit: limits.forms },
        submissionsThisMonth: {
          used: submissionsThisMonth,
          limit: limits.submissionsPerMonth,
        },
        products: { used: productsCount, limit: limits.products },
        categories: { used: categoriesCount, limit: limits.categories },
        coupons: { used: couponsCount, limit: limits.coupons },
        linkGroups: { used: linkGroupsCount, limit: limits.linkGroups },
        storage: { used: storageUsed, limit: limits.storageBytes },
        sessions: { used: sessionsCount, limit: limits.maxSessions },
        postsToday: { used: postsToday, limit: limits.postsPerDay },
      },
    };
  }

  /**
   * التحقق من حد عددي معين
   * يُستخدم من PlanGuard و من Services مباشرة
   */
  async checkLimit(
    userId: string,
    limitKey: keyof PlanLimits,
    currentCount?: number,
  ): Promise<{ allowed: boolean; current: number; limit: number | boolean | string }> {
    const limits = await this.getUserLimits(userId);
    const limitValue = limits[limitKey];

    // ميزة boolean — فقط تحقق من التفعيل
    if (typeof limitValue === 'boolean') {
      return { allowed: limitValue, current: 0, limit: limitValue };
    }

    // ميزة string (مستوى) — اعتبرها مفعلة
    if (typeof limitValue === 'string') {
      return { allowed: true, current: 0, limit: limitValue };
    }

    // حد عددي
    if (typeof limitValue === 'number') {
      if (limitValue === Infinity) {
        return {
          allowed: true,
          current: currentCount ?? 0,
          limit: Infinity,
        };
      }

      // إذا لم يُمرر العدد الحالي، احسبه
      const count = currentCount ?? (await this.countResource(userId, limitKey));
      return {
        allowed: count < limitValue,
        current: count,
        limit: limitValue,
      };
    }

    return { allowed: false, current: 0, limit: limitValue };
  }

  /**
   * حساب عدد الموارد الحالية للمستخدم
   */
  private async countResource(
    userId: string,
    limitKey: keyof PlanLimits,
  ): Promise<number> {
    switch (limitKey) {
      case 'forms':
        return this.prisma.form.count({ where: { userId } });
      case 'products':
        return this.prisma.products.count({
          where: { stores: { userId }, status: { not: 'INACTIVE' } },
        });
      case 'categories':
        return this.prisma.product_categories.count({
          where: { stores: { userId } },
        });
      case 'coupons':
        return this.prisma.coupons.count({
          where: { stores: { userId } },
        });
      case 'linkGroups':
        return this.prisma.linkGroup.count({
          where: { profile: { userId } },
        });
      case 'imagesPerProduct':
        return 0; // يُحسب لكل منتج على حدة
      case 'maxSessions':
        return this.prisma.session.count({
          where: { userId, isRevoked: false },
        });
      case 'postsPerDay': {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        return this.prisma.posts.count({
          where: { userId, createdAt: { gte: startOfDay } },
        });
      }
      case 'submissionsPerMonth': {
        const startOfMonth = new Date();
        startOfMonth.setDate(1);
        startOfMonth.setHours(0, 0, 0, 0);
        return this.prisma.form_submissions.count({
          where: {
            form: { userId },
            createdAt: { gte: startOfMonth },
          },
        });
      }
      default:
        return 0;
    }
  }

  /**
   * إنشاء اشتراك مجاني (يُستدعى عند إنشاء حساب جديد)
   */
  async createFreeSubscription(userId: string) {
    return this.prisma.subscription.upsert({
      where: { userId },
      update: {},
      create: {
        userId,
        plan: 'FREE',
        status: 'ACTIVE',
      },
    });
  }

  /**
   * ترقية الاشتراك (بعد الدفع)
   */
  async upgradePlan(
    userId: string,
    newPlan: SubscriptionPlan,
    billingCycle: BillingCycle,
  ) {
    if (newPlan === 'FREE') {
      throw new BadRequestException('لا يمكن الترقية إلى الباقة المجانية');
    }

    const currentPlan = await this.getUserPlan(userId);
    if (PLAN_ORDER[newPlan] <= PLAN_ORDER[currentPlan]) {
      throw new BadRequestException(
        'الباقة المطلوبة يجب أن تكون أعلى من باقتك الحالية',
      );
    }

    const price = PLAN_PRICES[newPlan];
    const amount =
      billingCycle === 'YEARLY' ? price.yearly : price.monthly;

    const now = new Date();
    const periodEnd = new Date(now);
    if (billingCycle === 'YEARLY') {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    } else {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // تحديث الاشتراك
      const subscription = await tx.subscription.upsert({
        where: { userId },
        update: {
          plan: newPlan,
          status: 'ACTIVE',
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
          cancelledAt: null,
        },
        create: {
          userId,
          plan: newPlan,
          status: 'ACTIVE',
          billingCycle,
          currentPeriodStart: now,
          currentPeriodEnd: periodEnd,
        },
      });

      // تسجيل الدفع
      await tx.subscriptionPayment.create({
        data: {
          subscriptionId: subscription.id,
          amount,
          billingCycle,
          status: 'COMPLETED',
          paidAt: now,
        },
      });

      // تحديث حد التخزين في الملف الشخصي
      const newLimits = PLAN_LIMITS[newPlan];
      await tx.profile.updateMany({
        where: { userId },
        data: { storageLimit: BigInt(newLimits.storageBytes) },
      });

      return subscription;
    });

    // مسح الكاش
    await this.invalidateCache(userId);

    return result;
  }

  /**
   * إلغاء الاشتراك (يبقى فعالاً حتى نهاية الفترة)
   */
  async cancelSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || subscription.plan === 'FREE') {
      throw new BadRequestException('لا يوجد اشتراك مدفوع لإلغائه');
    }

    if (subscription.status === 'CANCELLED') {
      throw new BadRequestException('الاشتراك ملغي مسبقاً');
    }

    await this.prisma.subscription.update({
      where: { userId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });

    await this.invalidateCache(userId);

    return {
      message: 'تم إلغاء الاشتراك. سيبقى فعالاً حتى نهاية الفترة الحالية.',
      activeUntil: subscription.currentPeriodEnd,
    };
  }

  /**
   * تعيين باقة يدوياً (للأدمن فقط)
   */
  async adminSetPlan(
    userId: string,
    plan: SubscriptionPlan,
    billingCycle?: BillingCycle,
  ) {
    const now = new Date();
    const periodEnd = new Date(now);

    if (plan !== 'FREE' && billingCycle) {
      if (billingCycle === 'YEARLY') {
        periodEnd.setFullYear(periodEnd.getFullYear() + 1);
      } else {
        periodEnd.setMonth(periodEnd.getMonth() + 1);
      }
    }

    const subscription = await this.prisma.subscription.upsert({
      where: { userId },
      update: {
        plan,
        status: 'ACTIVE',
        billingCycle: plan === 'FREE' ? null : billingCycle,
        currentPeriodStart: plan === 'FREE' ? null : now,
        currentPeriodEnd: plan === 'FREE' ? null : periodEnd,
        cancelledAt: null,
      },
      create: {
        userId,
        plan,
        status: 'ACTIVE',
        billingCycle: plan === 'FREE' ? null : billingCycle,
        currentPeriodStart: plan === 'FREE' ? null : now,
        currentPeriodEnd: plan === 'FREE' ? null : periodEnd,
      },
    });

    // تحديث حد التخزين
    const newLimits = PLAN_LIMITS[plan];
    await this.prisma.profile.updateMany({
      where: { userId },
      data: { storageLimit: BigInt(newLimits.storageBytes) },
    });

    await this.invalidateCache(userId);
    return subscription;
  }

  /**
   * جلب جميع الباقات مع الأسعار (للعرض العام)
   */
  getPlansOverview() {
    return {
      plans: [
        {
          id: 'FREE',
          name: 'المجانية',
          nameEn: 'Free',
          price: { monthly: 0, yearly: 0 },
          limits: PLAN_LIMITS.FREE,
        },
        {
          id: 'PRO',
          name: 'الاحترافية',
          nameEn: 'Pro',
          price: PLAN_PRICES.PRO,
          limits: PLAN_LIMITS.PRO,
        },
        {
          id: 'WHALE',
          name: 'الحوت',
          nameEn: 'Whale',
          price: PLAN_PRICES.WHALE,
          limits: PLAN_LIMITS.WHALE,
        },
        {
          id: 'BUSINESS',
          name: 'الأعمال والشركات',
          nameEn: 'Business',
          price: PLAN_PRICES.BUSINESS,
          limits: PLAN_LIMITS.BUSINESS,
        },
      ],
    };
  }

  /**
   * مسح كاش الاشتراك
   */
  private async invalidateCache(userId: string) {
    await this.redis
      .del(`${this.CACHE_PREFIX}${userId}`)
      .catch(() => {});
  }
}

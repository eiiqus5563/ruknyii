import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SubscriptionPlan } from '@prisma/client';
import { SubscriptionsService } from '../../../domain/subscriptions/subscriptions.service';
import {
  PLAN_ORDER,
  PlanLimits,
} from '../../../domain/subscriptions/plan-limits.config';
import {
  REQUIRE_PLAN_KEY,
  CHECK_LIMIT_KEY,
  CHECK_FEATURE_KEY,
} from '../decorators/auth/plan.decorator';

/**
 * 🔒 PlanGuard — يتحقق من باقة المستخدم
 *
 * يدعم 3 أنواع فحص:
 * 1. @RequirePlan('PRO')        — الحد الأدنى للباقة
 * 2. @CheckLimit('products')    — حد عددي
 * 3. @CheckFeature('webhook')   — ميزة boolean/string
 *
 * يجب استخدامه بعد JwtAuthGuard:
 * @UseGuards(JwtAuthGuard, PlanGuard)
 */
@Injectable()
export class PlanGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private subscriptionsService: SubscriptionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user?.id) {
      throw new ForbiddenException('المستخدم غير مصادق');
    }

    // 1. فحص الباقة المطلوبة @RequirePlan()
    const requiredPlan = this.reflector.getAllAndOverride<SubscriptionPlan>(
      REQUIRE_PLAN_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (requiredPlan) {
      const userPlan = await this.subscriptionsService.getUserPlan(user.id);
      if (PLAN_ORDER[userPlan] < PLAN_ORDER[requiredPlan]) {
        throw new ForbiddenException({
          message: `هذه الميزة تتطلب باقة ${this.getPlanName(requiredPlan)} أو أعلى`,
          code: 'PLAN_REQUIRED',
          requiredPlan,
          currentPlan: userPlan,
        });
      }
    }

    // 2. فحص الحد العددي @CheckLimit()
    const limitKey = this.reflector.getAllAndOverride<keyof PlanLimits>(
      CHECK_LIMIT_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (limitKey) {
      const result = await this.subscriptionsService.checkLimit(
        user.id,
        limitKey,
      );
      if (!result.allowed) {
        const userPlan = await this.subscriptionsService.getUserPlan(user.id);
        throw new ForbiddenException({
          message: `لقد وصلت إلى الحد الأقصى (${result.current}/${result.limit}). قم بترقية باقتك للحصول على المزيد.`,
          code: 'LIMIT_REACHED',
          limitKey,
          current: result.current,
          limit: result.limit,
          currentPlan: userPlan,
        });
      }
    }

    // 3. فحص الميزة @CheckFeature()
    const featureKey = this.reflector.getAllAndOverride<keyof PlanLimits>(
      CHECK_FEATURE_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (featureKey) {
      const result = await this.subscriptionsService.checkLimit(
        user.id,
        featureKey,
      );
      if (!result.allowed) {
        const userPlan = await this.subscriptionsService.getUserPlan(user.id);
        throw new ForbiddenException({
          message: `هذه الميزة غير متاحة في باقتك الحالية. قم بالترقية لتفعيلها.`,
          code: 'FEATURE_UNAVAILABLE',
          featureKey,
          currentPlan: userPlan,
        });
      }
    }

    return true;
  }

  private getPlanName(plan: SubscriptionPlan): string {
    const names: Record<SubscriptionPlan, string> = {
      FREE: 'المجانية',
      PRO: 'الاحترافية',
      WHALE: 'الحوت',
      BUSINESS: 'الأعمال',
    };
    return names[plan];
  }
}

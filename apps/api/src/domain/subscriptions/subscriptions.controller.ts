import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/common/guards/auth/jwt-auth.guard';
import { RolesGuard } from '../../core/common/guards/roles.guard';
import { Roles } from '../../core/common/decorators/auth/roles.decorator';
import {
  CurrentUser,
  AuthenticatedUser,
} from '../../core/common/decorators/auth/current-user.decorator';
import { Role } from '@prisma/client';
import { SubscriptionsService } from './subscriptions.service';
import { UpgradePlanDto, AdminSetPlanDto } from './dto/subscription.dto';

@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private subscriptionsService: SubscriptionsService) {}

  /**
   * 📋 جلب جميع الباقات (عام - بدون تسجيل دخول)
   * GET /subscriptions/plans
   */
  @Get('plans')
  getPlans() {
    return this.subscriptionsService.getPlansOverview();
  }

  /**
   * 📊 جلب تفاصيل اشتراكي الحالي
   * GET /subscriptions/me
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMySubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getSubscriptionDetails(user.id);
  }

  /**
   * 📈 جلب ملخص الاستخدام (كم استخدمت من الحدود)
   * GET /subscriptions/me/usage
   */
  @UseGuards(JwtAuthGuard)
  @Get('me/usage')
  getMyUsage(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.getUsageSummary(user.id);
  }

  /**
   * ⬆️ ترقية الباقة
   * POST /subscriptions/upgrade
   */
  @UseGuards(JwtAuthGuard)
  @Post('upgrade')
  upgradePlan(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpgradePlanDto,
  ) {
    return this.subscriptionsService.upgradePlan(
      user.id,
      dto.plan,
      dto.billingCycle,
    );
  }

  /**
   * ❌ إلغاء الاشتراك
   * POST /subscriptions/cancel
   */
  @UseGuards(JwtAuthGuard)
  @Post('cancel')
  cancelSubscription(@CurrentUser() user: AuthenticatedUser) {
    return this.subscriptionsService.cancelSubscription(user.id);
  }

  // ======== Admin Endpoints ========

  /**
   * 🔧 تعيين باقة مستخدم (أدمن)
   * POST /subscriptions/admin/:userId/set-plan
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('admin/:userId/set-plan')
  adminSetPlan(
    @Param('userId') userId: string,
    @Body() dto: AdminSetPlanDto,
  ) {
    return this.subscriptionsService.adminSetPlan(
      userId,
      dto.plan,
      dto.billingCycle,
    );
  }
}

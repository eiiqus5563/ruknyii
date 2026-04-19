import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../core/common/decorators/auth/current-user.decorator';
import { DevSubscriptionsService } from './dev-subscriptions.service';
import { UpgradePlanDto } from './dto/upgrade-plan.dto';

@ApiTags('Developer - Subscription')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'developer/subscription', version: '1' })
export class DevSubscriptionsController {
  constructor(private readonly subscriptionsService: DevSubscriptionsService) {}

  @Get()
  @ApiOperation({ summary: 'اشتراكي الحالي' })
  getSubscription(@CurrentUser('id') userId: string) {
    return this.subscriptionsService.getSubscription(userId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'الخطط المتاحة' })
  getPlans() {
    return this.subscriptionsService.getAvailablePlans();
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'ترقية الخطة' })
  upgradePlan(
    @CurrentUser('id') userId: string,
    @Body() dto: UpgradePlanDto,
  ) {
    return this.subscriptionsService.upgradePlan(userId, dto);
  }
}

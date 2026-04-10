import { Module, Global } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { PrismaModule } from '../../core/database/prisma/prisma.module';
import { RedisModule } from '../../core/cache/redis.module';
import { PlanGuard } from '../../core/common/guards/plan.guard';

/**
 * 📦 موديول الاشتراكات
 *
 * @Global — لأن SubscriptionsService و PlanGuard يُستخدمان في كل الموديولات
 */
@Global()
@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, PlanGuard],
  exports: [SubscriptionsService, PlanGuard],
})
export class SubscriptionsModule {}

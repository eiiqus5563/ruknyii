import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';
import { PrismaModule } from '../../core/database/prisma/prisma.module';
import { RedisModule } from '../../core/cache/redis.module';
import { AuthModule } from '../auth/auth.module';

// API Keys
import { ApiKeysController } from './api-keys/api-keys.controller';
import { ApiKeysService } from './api-keys/api-keys.service';
import { ApiKeyAuthGuard } from './api-keys/guards/api-key-auth.guard';

// Subscriptions
import { DevSubscriptionsController } from './subscriptions/dev-subscriptions.controller';
import { DevSubscriptionsService } from './subscriptions/dev-subscriptions.service';

// Wallet
import { WalletController } from './wallet/wallet.controller';
import { WalletService } from './wallet/wallet.service';

// Webhooks
import { DevWebhooksController } from './webhooks/dev-webhooks.controller';
import { DevWebhooksService } from './webhooks/dev-webhooks.service';
import { WebhookDeliveryService } from './webhooks/webhook-delivery.service';
import { WebhookDeliveryProcessor } from './webhooks/webhook-delivery.processor';

// Contacts
import { ContactsController } from './contacts/contacts.controller';
import { ContactsService } from './contacts/contacts.service';

// Usage
import { UsageController } from './usage/usage.controller';
import { UsageService } from './usage/usage.service';

// Apps
import { AppsController } from './apps/apps.controller';
import { AppsService } from './apps/apps.service';

/**
 * 🔧 Developer Module
 *
 * يدير كل ما يخص المطوّرين:
 * - API Keys (إنشاء/إدارة/تحقق)
 * - اشتراكات المطوّرين
 * - المحفظة (شحن/خصم/تاريخ)
 * - Webhooks
 * - جهات الاتصال
 * - الاستخدام والتحليلات
 */
@Module({
  imports: [
    PrismaModule,
    RedisModule,
    AuthModule,
    // Webhook delivery queue
    BullModule.registerQueueAsync({
      name: 'webhook-delivery',
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
        },
        defaultJobOptions: {
          attempts: 5,
          backoff: {
            type: 'exponential',
            delay: 30000, // 30 ثانية → 5 دقائق → 30 دقيقة
          },
          removeOnComplete: 200,
          removeOnFail: 1000,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [
    AppsController,
    ApiKeysController,
    DevSubscriptionsController,
    WalletController,
    DevWebhooksController,
    ContactsController,
    UsageController,
  ],
  providers: [
    AppsService,
    ApiKeysService,
    ApiKeyAuthGuard,
    DevSubscriptionsService,
    WalletService,
    DevWebhooksService,
    WebhookDeliveryService,
    WebhookDeliveryProcessor,
    ContactsService,
    UsageService,
  ],
  exports: [
    AppsService,
    ApiKeysService,
    ApiKeyAuthGuard,
    DevSubscriptionsService,
    WalletService,
    WebhookDeliveryService,
    UsageService,
  ],
})
export class DeveloperModule {}

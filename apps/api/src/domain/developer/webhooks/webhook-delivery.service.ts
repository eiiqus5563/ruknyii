import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { DevWebhooksService } from './dev-webhooks.service';

/**
 * 🔔 خدمة توصيل Webhook Events للمطوّرين
 *
 * تستقبل أحداث من النظام (رسائل، قوالب، إلخ)
 * وتوصّلها لـ webhooks المطوّر عبر طابور (BullMQ)
 */
@Injectable()
export class WebhookDeliveryService {
  private readonly logger = new Logger(WebhookDeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private webhooksService: DevWebhooksService,
    @InjectQueue('webhook-delivery') private webhookQueue: Queue,
  ) {}

  /**
   * إرسال حدث لكل webhooks المطوّر المشتركة
   */
  async dispatchEvent(userId: string, eventType: string, data: any) {
    const webhooks = await this.webhooksService.getActiveWebhooksForEvent(
      userId,
      eventType,
    );

    if (webhooks.length === 0) return;

    const payload = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`,
      type: eventType,
      timestamp: new Date().toISOString(),
      data,
    };

    for (const webhook of webhooks) {
      await this.webhookQueue.add('deliver', {
        webhookId: webhook.id,
        url: webhook.url,
        secret: webhook.secret,
        payload,
        eventType,
        attemptNumber: 1,
      });
    }

    this.logger.debug(
      `Dispatched "${eventType}" to ${webhooks.length} webhook(s) for user ${userId}`,
    );
  }

  /**
   * معالجة توصيل webhook (يُستدعى من Queue Processor)
   */
  async processDelivery(job: {
    webhookId: string;
    url: string;
    secret: string;
    payload: any;
    eventType: string;
    attemptNumber: number;
  }) {
    const startTime = Date.now();
    const payloadStr = JSON.stringify(job.payload);
    const signature = this.webhooksService.signPayload(payloadStr, job.secret);

    let success = false;
    let responseCode: number | null = null;
    let responseBody: string | null = null;
    let errorMessage: string | null = null;

    try {
      const response = await fetch(job.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Rukny-Signature': `sha256=${signature}`,
          'X-Rukny-Event': job.eventType,
          'X-Rukny-Delivery': job.payload.id,
        },
        body: payloadStr,
        signal: AbortSignal.timeout(30000),
      });

      responseCode = response.status;
      responseBody = await response.text().catch(() => null);
      success = response.ok;
    } catch (error) {
      errorMessage = error.message;
    }

    const duration = Date.now() - startTime;

    // تسجيل النتيجة
    await this.prisma.webhookDeliveryLog.create({
      data: {
        webhookId: job.webhookId,
        eventType: job.eventType,
        payload: job.payload,
        responseCode,
        responseBody: responseBody?.substring(0, 1000),
        duration,
        success,
        errorMessage,
        attemptNumber: job.attemptNumber,
      },
    });

    // تحديث حالة الـ webhook
    if (success) {
      await this.prisma.developerWebhook.update({
        where: { id: job.webhookId },
        data: {
          lastSuccessAt: new Date(),
          lastResponseCode: responseCode,
          failureCount: 0,
        },
      });
    } else {
      const webhook = await this.prisma.developerWebhook.update({
        where: { id: job.webhookId },
        data: {
          lastFailureAt: new Date(),
          lastResponseCode: responseCode,
          failureCount: { increment: 1 },
        },
      });

      // تعطيل تلقائي بعد 10 فشل متتالي
      if (webhook.failureCount >= 10) {
        await this.prisma.developerWebhook.update({
          where: { id: job.webhookId },
          data: {
            status: 'AUTO_DISABLED',
            disabledReason: `Auto-disabled after ${webhook.failureCount} consecutive failures`,
          },
        });
        this.logger.warn(`Webhook ${job.webhookId} auto-disabled after 10 failures`);
      }

      // إعادة المحاولة إن لم يصل للحد
      if (!success && job.attemptNumber < 5) {
        throw new Error(`Webhook delivery failed: ${errorMessage || `HTTP ${responseCode}`}`);
      }
    }
  }
}

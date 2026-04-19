import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { randomBytes, createHmac } from 'crypto';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { DEVELOPER_PLAN_LIMITS } from '../subscriptions/dev-plan-limits.config';

@Injectable()
export class DevWebhooksService {
  private readonly logger = new Logger(DevWebhooksService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء webhook جديد
   */
  async create(userId: string, dto: CreateWebhookDto) {
    await this.checkWebhookLimit(userId);

    const secret = `whsec_${randomBytes(32).toString('hex')}`;

    const webhook = await this.prisma.developerWebhook.create({
      data: {
        userId,
        url: dto.url,
        secret,
        events: dto.events,
        description: dto.description,
      },
    });

    return {
      ...webhook,
      secret, // يُعرض مرة واحدة فقط
    };
  }

  /**
   * قائمة webhooks
   */
  async findAll(userId: string) {
    return this.prisma.developerWebhook.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        url: true,
        events: true,
        status: true,
        description: true,
        failureCount: true,
        lastSuccessAt: true,
        lastFailureAt: true,
        lastResponseCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * تحديث webhook
   */
  async update(userId: string, webhookId: string, dto: UpdateWebhookDto) {
    const webhook = await this.prisma.developerWebhook.findFirst({
      where: { id: webhookId, userId },
    });
    if (!webhook) throw new NotFoundException('Webhook not found');

    return this.prisma.developerWebhook.update({
      where: { id: webhookId },
      data: {
        ...(dto.url && { url: dto.url }),
        ...(dto.events && { events: dto.events }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.status && { status: dto.status as any }),
      },
      select: {
        id: true,
        url: true,
        events: true,
        status: true,
        description: true,
        updatedAt: true,
      },
    });
  }

  /**
   * حذف webhook
   */
  async remove(userId: string, webhookId: string) {
    const webhook = await this.prisma.developerWebhook.findFirst({
      where: { id: webhookId, userId },
    });
    if (!webhook) throw new NotFoundException('Webhook not found');

    await this.prisma.developerWebhook.delete({ where: { id: webhookId } });
    return { success: true };
  }

  /**
   * تدوير المفتاح السري
   */
  async rotateSecret(userId: string, webhookId: string) {
    const webhook = await this.prisma.developerWebhook.findFirst({
      where: { id: webhookId, userId },
    });
    if (!webhook) throw new NotFoundException('Webhook not found');

    const newSecret = `whsec_${randomBytes(32).toString('hex')}`;

    await this.prisma.developerWebhook.update({
      where: { id: webhookId },
      data: { secret: newSecret },
    });

    return { secret: newSecret };
  }

  /**
   * اختبار webhook بحدث تجريبي
   */
  async test(userId: string, webhookId: string) {
    const webhook = await this.prisma.developerWebhook.findFirst({
      where: { id: webhookId, userId },
    });
    if (!webhook) throw new NotFoundException('Webhook not found');

    const testPayload = {
      id: `evt_test_${randomBytes(8).toString('hex')}`,
      type: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook event from Rukny.io',
      },
    };

    const signature = this.signPayload(JSON.stringify(testPayload), webhook.secret);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Rukny-Signature': `sha256=${signature}`,
          'X-Rukny-Event': 'test',
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000),
      });

      return {
        success: response.ok,
        statusCode: response.status,
        message: response.ok ? 'Webhook test successful' : 'Webhook returned non-2xx status',
      };
    } catch (error) {
      return {
        success: false,
        statusCode: null,
        message: `Connection failed: ${error.message}`,
      };
    }
  }

  /**
   * الحصول على webhooks النشطة لمستخدم وحدث معيّن
   */
  async getActiveWebhooksForEvent(userId: string, eventType: string) {
    return this.prisma.developerWebhook.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        events: { has: eventType },
      },
    });
  }

  /**
   * توقيع payload بـ HMAC-SHA256
   */
  signPayload(payload: string, secret: string): string {
    return createHmac('sha256', secret).update(payload).digest('hex');
  }

  /**
   * التحقق من حدود webhooks
   */
  private async checkWebhookLimit(userId: string) {
    const subscription = await this.prisma.developerSubscription.findUnique({
      where: { userId },
      select: { plan: true },
    });

    const plan = subscription?.plan || 'FREE';
    const limits = DEVELOPER_PLAN_LIMITS[plan];

    const currentCount = await this.prisma.developerWebhook.count({
      where: { userId, status: { not: 'AUTO_DISABLED' } },
    });

    if (currentCount >= limits.maxWebhooks) {
      throw new ForbiddenException(
        `Webhook limit reached (${limits.maxWebhooks}). Upgrade your plan for more.`,
      );
    }
  }
}

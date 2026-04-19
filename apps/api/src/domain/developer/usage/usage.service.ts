import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { RedisService } from '../../../core/cache/redis.service';
import { WalletService } from '../wallet/wallet.service';
import { DevSubscriptionsService } from '../subscriptions/dev-subscriptions.service';

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private walletService: WalletService,
    private subscriptionsService: DevSubscriptionsService,
  ) {}

  /**
   * ملخص الاستخدام الشامل
   */
  async getUsageSummary(userId: string) {
    const [subscription, wallet, messageCounts, apiKeysCount, contactsCount, webhooksCount, phoneNumbersCount] =
      await Promise.all([
        this.subscriptionsService.getSubscription(userId),
        this.walletService.getWallet(userId),
        this.getMessageCounts(userId),
        this.prisma.developerApiKey.count({ where: { userId, status: 'ACTIVE' } }),
        this.prisma.developerContact.count({ where: { userId } }),
        this.prisma.developerWebhook.count({ where: { userId } }),
        this.prisma.developerPhoneNumber.count({
          where: {
            account: { userId },
            status: 'ACTIVE',
          },
        }),
      ]);

    return {
      plan: subscription.plan || 'FREE',
      walletBalance: wallet.balance || 0,
      messages: {
        used: subscription.messagesUsed || 0,
        limit: subscription.messagesLimit || 1000,
        ...messageCounts,
      },
      resources: {
        apiKeys: { used: apiKeysCount, limit: subscription.apiKeysLimit || 1 },
        contacts: { used: contactsCount, limit: subscription.contactsLimit || 500 },
        webhooks: { used: webhooksCount, limit: subscription.webhooksLimit || 2 },
        phoneNumbers: { used: phoneNumbersCount, limit: subscription.phoneNumbersLimit || 1 },
      },
      period: {
        start: subscription.currentPeriodStart,
        end: subscription.currentPeriodEnd,
      },
    };
  }

  /**
   * الاستخدام اليومي (آخر 30 يوم)
   */
  async getDailyUsage(userId: string, days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyStats = await this.prisma.$queryRaw<
      { date: string; total: number; delivered: number; failed: number }[]
    >`
      SELECT
        DATE("createdAt") as date,
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE status = 'DELIVERED')::int as delivered,
        COUNT(*) FILTER (WHERE status = 'FAILED')::int as failed
      FROM whatsapp_message_logs
      WHERE "userId" = ${userId}
        AND "createdAt" >= ${startDate}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    return dailyStats;
  }

  /**
   * تفاصيل الرسائل مع تصفية
   */
  async getMessageLogs(
    userId: string,
    options?: {
      status?: string;
      direction?: string;
      type?: string;
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
    },
  ) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);

    const where: any = { userId };

    if (options?.status) where.status = options.status;
    if (options?.direction) where.direction = options.direction;
    if (options?.type) where.messageType = options.type;
    if (options?.from || options?.to) {
      where.createdAt = {};
      if (options?.from) where.createdAt.gte = new Date(options.from);
      if (options?.to) where.createdAt.lte = new Date(options.to);
    }

    const [messages, total] = await this.prisma.$transaction([
      this.prisma.whatsappMessageLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          direction: true,
          messageType: true,
          status: true,
          recipientNumber: true,
          senderNumber: true,
          conversationCategory: true,
          errorCode: true,
          errorMessage: true,
          pricing: true,
          sentAt: true,
          deliveredAt: true,
          readAt: true,
          failedAt: true,
          createdAt: true,
        },
      }),
      this.prisma.whatsappMessageLog.count({ where }),
    ]);

    return {
      data: messages,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * إحصائيات الرسائل حسب الحالة والنوع
   */
  private async getMessageCounts(userId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [byStatus, byType, todayCount] = await Promise.all([
      this.prisma.whatsappMessageLog.groupBy({
        by: ['status'],
        where: { userId, createdAt: { gte: startOfMonth } },
        _count: true,
      }),
      this.prisma.whatsappMessageLog.groupBy({
        by: ['messageType'],
        where: { userId, createdAt: { gte: startOfMonth } },
        _count: true,
      }),
      this.prisma.whatsappMessageLog.count({
        where: {
          userId,
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ]);

    return {
      today: todayCount,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      byType: Object.fromEntries(byType.map((t) => [t.messageType, t._count])),
    };
  }
}

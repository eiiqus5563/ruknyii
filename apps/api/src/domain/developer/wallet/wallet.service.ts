import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { RedisService } from '../../../core/cache/redis.service';
import { TopUpWalletDto, UpdateAutoRechargeDto, UpdateLowBalanceAlertDto } from './dto/wallet.dto';

/**
 * تسعير الرسائل حسب فئة المحادثة (IQD)
 * أسعار Meta + هامش Rukny (~20%)
 */
export const MESSAGE_PRICING: Record<string, number> = {
  AUTHENTICATION: 12,  // ~$0.008
  UTILITY: 15,         // ~$0.01
  MARKETING: 60,       // ~$0.04
  SERVICE: 0,          // مجاني (أول 1000/شهر)
  REFERRAL_CONVERSION: 0,
};

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  /**
   * الحصول على/إنشاء محفظة المطوّر
   */
  async getWallet(userId: string) {
    let wallet = await this.prisma.developerWallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.prisma.developerWallet.create({
        data: { userId },
      });
    }

    return wallet;
  }

  async getAppWallet(userId: string, appId: string) {
    const app = await this.prisma.developerApp.findFirst({
      where: { appId, userId, status: 'ACTIVE' },
      select: { id: true, appId: true, name: true },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    let wallet = await this.prisma.developerAppWallet.findUnique({
      where: { developerAppId: app.id },
    });

    if (!wallet) {
      wallet = await this.prisma.developerAppWallet.create({
        data: { developerAppId: app.id },
      });
    }

    return {
      id: wallet.id,
      appId: app.appId,
      appName: app.name,
      balance: wallet.balance,
      currency: wallet.currency,
      totalAllocated: wallet.totalAllocated,
      totalSpent: wallet.totalSpent,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }

  async allocateToApp(userId: string, appId: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Amount must be greater than zero');
    }

    const [masterWallet, appWallet] = await Promise.all([
      this.getWallet(userId),
      this.getAppWallet(userId, appId),
    ]);

    if (masterWallet.balance < amount) {
      throw new BadRequestException('Insufficient main wallet balance');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextMasterBalance = masterWallet.balance - amount;

      await tx.developerWallet.update({
        where: { id: masterWallet.id },
        data: {
          balance: { decrement: amount },
        },
      });

      await tx.walletTransaction.create({
        data: {
          walletId: masterWallet.id,
          type: 'APP_ALLOCATION',
          amount,
          balanceBefore: masterWallet.balance,
          balanceAfter: nextMasterBalance,
          status: 'COMPLETED',
          description: `Transfer to app ${appWallet.appName}`,
          referenceId: appWallet.id,
          referenceType: 'app_wallet',
          metadata: {
            appId: appWallet.appId,
            appName: appWallet.appName,
          },
        },
      });

      const updatedAppWallet = await tx.developerAppWallet.update({
        where: { id: appWallet.id },
        data: {
          balance: { increment: amount },
          totalAllocated: { increment: amount },
        },
      });

      return {
        masterBalance: nextMasterBalance,
        appBalance: updatedAppWallet.balance,
      };
    });

    await this.redis.del(`wallet:${userId}`);
    await this.redis.del(`wallet:${userId}:balance`);

    return {
      success: true,
      amount,
      masterBalance: updated.masterBalance,
      appBalance: updated.appBalance,
    };
  }

  /**
   * شحن الرصيد
   */
  async topUp(userId: string, dto: TopUpWalletDto) {
    const wallet = await this.getWallet(userId);

    // إنشاء معاملة شحن (حالة PENDING حتى تأكيد الدفع)
    const transaction = await this.prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: 'TOP_UP',
        amount: dto.amount,
        balanceBefore: wallet.balance,
        balanceAfter: wallet.balance + dto.amount,
        status: 'PENDING',
        paymentMethod: dto.paymentMethod,
        description: `شحن رصيد - ${dto.paymentMethod}`,
      },
    });

    // TODO: هنا يتم التوجيه لبوابة الدفع (ZainCash, FastPay, etc.)
    // عند تأكيد الدفع، يتم استدعاء verifyTopUp

    return {
      transactionId: transaction.id,
      amount: dto.amount,
      paymentMethod: dto.paymentMethod,
      status: 'PENDING',
      // paymentUrl: await this.getPaymentUrl(dto) // عند ربط بوابة الدفع
    };
  }

  /**
   * تأكيد الشحن بعد نجاح الدفع
   */
  async verifyTopUp(userId: string, transactionId: string) {
    const wallet = await this.getWallet(userId);

    const transaction = await this.prisma.walletTransaction.findFirst({
      where: {
        id: transactionId,
        walletId: wallet.id,
        type: 'TOP_UP',
        status: 'PENDING',
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found or already processed');
    }

    // تحديث المحفظة والمعاملة في transaction واحد
    const [updatedWallet, updatedTransaction] = await this.prisma.$transaction([
      this.prisma.developerWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: transaction.amount },
          totalTopUps: { increment: transaction.amount },
        },
      }),
      this.prisma.walletTransaction.update({
        where: { id: transactionId },
        data: {
          status: 'COMPLETED',
          balanceAfter: wallet.balance + transaction.amount,
        },
      }),
    ]);

    // مسح الكاش
    await this.redis.del(`wallet:${userId}`);

    this.logger.log(`Top-up verified: ${transaction.amount} IQD for user ${userId}`);

    return {
      balance: updatedWallet.balance,
      transaction: updatedTransaction,
    };
  }

  /**
   * خصم رصيد لرسالة (يُستخدم من messaging service)
   */
  async chargeMessage(
    userId: string,
    developerAppId: string,
    messageLogId: string,
    category: string,
  ): Promise<{ success: boolean; newBalance: number }> {
    const price = MESSAGE_PRICING[category] || MESSAGE_PRICING.UTILITY;

    if (price === 0) {
      return { success: true, newBalance: -1 }; // مجاني
    }

    const appWallet = await this.prisma.developerAppWallet.findUnique({
      where: { developerAppId },
      include: {
        developerApp: {
          select: { userId: true },
        },
      },
    });

    if (!appWallet || appWallet.developerApp.userId !== userId) {
      throw new NotFoundException('App wallet not found');
    }

    if (appWallet.balance < price) {
      return { success: false, newBalance: appWallet.balance };
    }

    // خصم في transaction
    const [updatedWallet] = await this.prisma.$transaction([
      this.prisma.developerAppWallet.update({
        where: { id: appWallet.id },
        data: {
          balance: { decrement: price },
          totalSpent: { increment: price },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: (await this.getWallet(userId)).id,
          type: 'MESSAGE_CHARGE',
          amount: price,
          balanceBefore: appWallet.balance,
          balanceAfter: appWallet.balance - price,
          status: 'COMPLETED',
          referenceId: messageLogId,
          referenceType: 'message',
          description: `Message charge ${category}`,
          metadata: {
            appWalletId: appWallet.id,
            developerAppId,
          },
        },
      }),
    ]);

    return { success: true, newBalance: updatedWallet.balance };
  }

  /**
   * قائمة المعاملات
   */
  async getTransactions(
    userId: string,
    options?: { type?: string; page?: number; limit?: number },
  ) {
    const wallet = await this.getWallet(userId);
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);

    const where: any = { walletId: wallet.id };
    if (options?.type) {
      where.type = options.type;
    }

    const [transactions, total] = await this.prisma.$transaction([
      this.prisma.walletTransaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.walletTransaction.count({ where }),
    ]);

    return {
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * إعدادات الشحن التلقائي
   */
  async getAutoRecharge(userId: string) {
    const wallet = await this.getWallet(userId);
    return {
      enabled: wallet.autoRechargeEnabled,
      amount: wallet.autoRechargeAmount,
      threshold: wallet.autoRechargeThreshold,
    };
  }

  /**
   * تحديث إعدادات الشحن التلقائي
   */
  async updateAutoRecharge(userId: string, dto: UpdateAutoRechargeDto) {
    const wallet = await this.getWallet(userId);

    const updated = await this.prisma.developerWallet.update({
      where: { id: wallet.id },
      data: {
        autoRechargeEnabled: dto.enabled ?? wallet.autoRechargeEnabled,
        autoRechargeAmount: dto.amount ?? wallet.autoRechargeAmount,
        autoRechargeThreshold: dto.threshold ?? wallet.autoRechargeThreshold,
      },
    });

    await this.redis.del(`wallet:${userId}`);

    return {
      enabled: updated.autoRechargeEnabled,
      amount: updated.autoRechargeAmount,
      threshold: updated.autoRechargeThreshold,
    };
  }

  /**
   * تحديث تنبيه انخفاض الرصيد
   */
  async updateLowBalanceAlert(userId: string, dto: UpdateLowBalanceAlertDto) {
    const wallet = await this.getWallet(userId);

    const updated = await this.prisma.developerWallet.update({
      where: { id: wallet.id },
      data: {
        lowBalanceAlert: dto.threshold ?? null,
      },
    });

    return { lowBalanceAlert: updated.lowBalanceAlert };
  }

  /**
   * أسعار الرسائل
   */
  getPricing() {
    return Object.entries(MESSAGE_PRICING).map(([category, price]) => ({
      category,
      priceIQD: price,
      description: this.getCategoryDescription(category),
    }));
  }

  /**
   * الحصول على الرصيد (مع كاش)
   */
  async getBalance(userId: string): Promise<number> {
    const cached = await this.redis.get<number>(`wallet:${userId}:balance`);
    if (cached !== null && cached !== undefined) return cached;

    const wallet = await this.getWallet(userId);
    await this.redis.set(`wallet:${userId}:balance`, wallet.balance, 60);
    return wallet.balance;
  }

  /**
   * شحن تلقائي
   */
  private async triggerAutoRecharge(userId: string, wallet: any) {
    if (!wallet.autoRechargeAmount) return;

    this.logger.log(`Auto-recharge triggered for user ${userId}: ${wallet.autoRechargeAmount} IQD`);

    // TODO: تكامل مع بوابة الدفع المحفوظة
    // حالياً نضيف الرصيد مباشرة (سيتم تحديثه عند ربط بوابة الدفع)
    await this.prisma.$transaction([
      this.prisma.developerWallet.update({
        where: { id: wallet.id },
        data: {
          balance: { increment: wallet.autoRechargeAmount },
          totalTopUps: { increment: wallet.autoRechargeAmount },
        },
      }),
      this.prisma.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: 'AUTO_RECHARGE',
          amount: wallet.autoRechargeAmount,
          balanceBefore: wallet.balance,
          balanceAfter: wallet.balance + wallet.autoRechargeAmount,
          status: 'COMPLETED',
          description: 'شحن تلقائي',
        },
      }),
    ]);

    await this.redis.del(`wallet:${userId}`);
  }

  private getCategoryDescription(category: string): string {
    const descriptions: Record<string, string> = {
      AUTHENTICATION: 'رسائل المصادقة (OTP)',
      UTILITY: 'رسائل الخدمات (تأكيد طلب، تتبع)',
      MARKETING: 'رسائل تسويقية (عروض، حملات)',
      SERVICE: 'محادثات خدمة العملاء (مجانية - أول 1000/شهر)',
      REFERRAL_CONVERSION: 'إحالات (مجانية)',
    };
    return descriptions[category] || category;
  }
}

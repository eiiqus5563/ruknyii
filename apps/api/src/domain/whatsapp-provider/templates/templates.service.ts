import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { MetaApiService } from '../shared/meta-api.service';
import { TokenEncryptionService } from '../shared/token-encryption.service';
import { CreateTemplateDto } from './dto/template.dto';

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    private prisma: PrismaService,
    private metaApi: MetaApiService,
    private tokenEncryption: TokenEncryptionService,
  ) {}

  private async resolveDeveloperAppId(userId: string, appId: string) {
    const app = await this.prisma.developerApp.findFirst({
      where: { appId, userId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    return app.id;
  }

  /**
   * إنشاء قالب جديد
   */
  async create(userId: string, appId: string, dto: CreateTemplateDto) {
    const account = await this.getActiveAccount(userId, appId, dto.accountId);
    const accessToken = this.tokenEncryption.decrypt(account.accessTokenEncrypted!);

    // إرسال لـ Meta
    try {
      const result = await this.metaApi.createTemplate(account.wabaId, accessToken, {
        name: dto.name,
        language: dto.language,
        category: dto.category,
        components: dto.components,
      });

      // تخزين القالب محلياً
      const template = await this.prisma.developerWhatsappTemplate.create({
        data: {
          accountId: account.id,
          metaTemplateId: result.id,
          name: dto.name,
          language: dto.language,
          category: dto.category as any,
          status: 'PENDING',
          components: dto.components,
          lastSyncedAt: new Date(),
        },
      });

      return template;
    } catch (error) {
      const errorData = error.response?.data?.error || {};
      throw new BadRequestException({
        message: 'Failed to create template',
        error: errorData.message || error.message,
        code: errorData.code,
      });
    }
  }

  /**
   * قائمة القوالب
   */
  async findAll(userId: string, appId: string, accountId?: string) {
    const developerAppId = await this.resolveDeveloperAppId(userId, appId);
    const accounts = await this.prisma.developerWhatsappAccount.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        developerAppId,
      },
      select: { id: true },
    });

    const accountIds = accounts.map((a) => a.id);

    // If a specific account is requested, validate it belongs to this user
    const filterIds = accountId && accountIds.includes(accountId)
      ? [accountId]
      : accountIds;

    return this.prisma.developerWhatsappTemplate.findMany({
      where: { accountId: { in: filterIds } },
      include: {
        account: {
          select: { id: true, businessName: true, wabaId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * تفاصيل قالب
   */
  async findOne(userId: string, appId: string, templateName: string) {
    const developerAppId = await this.resolveDeveloperAppId(userId, appId);
    const accounts = await this.prisma.developerWhatsappAccount.findMany({
      where: {
        userId,
        status: 'ACTIVE',
        developerAppId,
      },
      select: { id: true },
    });

    const template = await this.prisma.developerWhatsappTemplate.findFirst({
      where: {
        accountId: { in: accounts.map((a) => a.id) },
        name: templateName,
      },
    });

    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  /**
   * حذف قالب
   */
  async remove(userId: string, appId: string, templateName: string) {
    const account = await this.getActiveAccount(userId, appId);
    const accessToken = this.tokenEncryption.decrypt(account.accessTokenEncrypted!);

    try {
      await this.metaApi.deleteTemplate(account.wabaId, accessToken, templateName);
    } catch (error) {
      this.logger.warn(`Failed to delete template from Meta: ${error.message}`);
    }

    await this.prisma.developerWhatsappTemplate.deleteMany({
      where: { accountId: account.id, name: templateName },
    });

    return { success: true };
  }

  /**
   * مزامنة القوالب مع Meta
   */
  async syncTemplates(userId: string, appId: string, accountId?: string) {
    const account = await this.getActiveAccount(userId, appId, accountId);
    const accessToken = this.tokenEncryption.decrypt(account.accessTokenEncrypted!);

    const metaTemplates = await this.metaApi.listTemplates(account.wabaId, accessToken);

    for (const mt of metaTemplates.data || []) {
      await this.prisma.developerWhatsappTemplate.upsert({
        where: {
          accountId_name_language: {
            accountId: account.id,
            name: mt.name,
            language: mt.language,
          },
        },
        update: {
          metaTemplateId: mt.id,
          status: this.mapTemplateStatus(mt.status),
          components: mt.components,
          category: mt.category as any,
          rejectedReason: mt.rejected_reason,
          qualityScore: mt.quality_score,
          lastSyncedAt: new Date(),
        },
        create: {
          accountId: account.id,
          metaTemplateId: mt.id,
          name: mt.name,
          language: mt.language,
          category: mt.category as any,
          status: this.mapTemplateStatus(mt.status),
          components: mt.components,
          rejectedReason: mt.rejected_reason,
          qualityScore: mt.quality_score,
          lastSyncedAt: new Date(),
        },
      });
    }

    return { synced: metaTemplates.data?.length || 0 };
  }

  /**
   * الحصول على أول حساب WABA نشط
   */
  private async getActiveAccount(userId: string, appId: string, accountId?: string) {
    const developerAppId = await this.resolveDeveloperAppId(userId, appId);

    const where: any = {
      userId,
      status: 'ACTIVE',
      developerAppId,
    };

    if (accountId) {
      where.id = accountId;
    }

    const account = await this.prisma.developerWhatsappAccount.findFirst({ where });

    if (!account || !account.accessTokenEncrypted) {
      throw new BadRequestException('No active WhatsApp Business Account found');
    }

    return account;
  }

  private mapTemplateStatus(status: string): any {
    const map: Record<string, string> = {
      APPROVED: 'APPROVED',
      PENDING: 'PENDING',
      REJECTED: 'REJECTED',
      PAUSED: 'PAUSED',
      DISABLED: 'DISABLED',
    };
    return map[status] || 'PENDING';
  }
}

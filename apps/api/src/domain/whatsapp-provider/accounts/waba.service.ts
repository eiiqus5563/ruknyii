import { Injectable, Logger, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { MetaApiService } from '../shared/meta-api.service';
import { TokenEncryptionService } from '../shared/token-encryption.service';
import { ConnectWabaDto } from './dto/connect-waba.dto';

@Injectable()
export class WabaService {
  private readonly logger = new Logger(WabaService.name);

  constructor(
    private prisma: PrismaService,
    private metaApi: MetaApiService,
    private tokenEncryption: TokenEncryptionService,
    private configService: ConfigService,
  ) {}

  /**
   * ربط حساب WABA عبر Embedded Signup
   *
   * التدفق:
   * 1. Frontend يفتح Facebook Login Dialog
   * 2. المستخدم يختار/ينشئ WABA ويربط رقم
   * 3. Facebook يرجع code إلى callback URL
   * 4. هذه الدالة تستبدل الـ code بـ access token
   * 5. تجلب معلومات WABA وأرقام الهاتف
   * 6. تخزّن كل شيء مشفّراً
   */
  async connect(userId: string, dto: ConnectWabaDto) {
    const app = await this.prisma.developerApp.findFirst({
      where: { appId: dto.appId, userId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    // 1. استبدال الكود بـ access token
    let tokenData;
    try {
      tokenData = await this.metaApi.exchangeCodeForToken(dto.code);
    } catch (error) {
      this.logger.error(`Failed to exchange code: ${error.message}`);
      throw new BadRequestException('Failed to exchange authorization code. Please try again.');
    }

    const accessToken = tokenData.access_token;

    // 2. Debug token للحصول على WABA IDs المرتبطة
    const debugInfo = await this.metaApi.debugToken(accessToken);
    const granularScopes = debugInfo.data?.granular_scopes || [];

    // استخراج WABA ID من الصلاحيات
    const wabaScope = granularScopes.find(
      (s: any) => s.scope === 'whatsapp_business_management',
    );

    const wabaIds: string[] = wabaScope?.target_ids || [];

    if (wabaIds.length === 0 && !dto.wabaId) {
      throw new BadRequestException(
        'No WhatsApp Business Account found. Please complete the Embedded Signup process.',
      );
    }

    const targetWabaId = dto.wabaId || wabaIds[0];

    // 3. التحقق من عدم التكرار بشكل ذكي
    const existing = await this.prisma.developerWhatsappAccount.findUnique({
      where: { wabaId: targetWabaId },
      include: { phoneNumbers: true },
    });

    if (existing) {
      // حالة 1: WABA مفصول → نحذف القديم ونسمح بالربط الجديد
      if (existing.status === 'DISCONNECTED') {
        await this.prisma.developerWhatsappAccount.delete({
          where: { id: existing.id },
        });
        this.logger.log(`Deleted disconnected WABA ${targetWabaId} to allow reconnection`);
      }
      // حالة 2: نفس المستخدم ونفس التطبيق → تحديث التوكن وإعادة التفعيل
      else if (existing.userId === userId && existing.developerAppId === app.id) {
        const encryptedToken = this.tokenEncryption.encrypt(accessToken);
        const updated = await this.prisma.developerWhatsappAccount.update({
          where: { id: existing.id },
          data: {
            accessTokenEncrypted: encryptedToken,
            status: 'ACTIVE',
            connectedAt: new Date(),
            disconnectedAt: null,
          },
          include: { phoneNumbers: true },
        });
        this.logger.log(`Reconnected WABA ${targetWabaId} for user ${userId}`);
        return updated;
      }
      // حالة 3: نفس المستخدم لكن تطبيق مختلف
      else if (existing.userId === userId) {
        throw new ConflictException(
          'This WABA is already connected to another app in your account',
        );
      }
      // حالة 4: مستخدم مختلف
      else {
        throw new ConflictException(
          'This WABA is connected to another developer account',
        );
      }
    }

    // 4. جلب معلومات WABA
    const wabaInfo = await this.metaApi.getWabaInfo(targetWabaId, accessToken);

    // 5. تشفير وتخزين access token
    const encryptedToken = this.tokenEncryption.encrypt(accessToken);

    // 6. إنشاء حساب WABA في قاعدة البيانات
    const account = await this.prisma.developerWhatsappAccount.create({
      data: {
        userId,
        developerAppId: app.id,
        wabaId: targetWabaId,
        businessName: wabaInfo.name,
        businessId: wabaInfo.id,
        currency: wabaInfo.currency || 'USD',
        timezoneId: wabaInfo.timezone_id || 'Asia/Baghdad',
        status: 'ACTIVE',
        accessTokenEncrypted: encryptedToken,
        connectedAt: new Date(),
        webhookSubscribed: false,
      },
    });

    // 7. جلب وتخزين أرقام الهاتف
    try {
      const phoneData = await this.metaApi.getPhoneNumbers(targetWabaId, accessToken);
      const phones = phoneData.data || [];

      for (const phone of phones) {
        await this.prisma.developerPhoneNumber.create({
          data: {
            accountId: account.id,
            phoneNumber: phone.display_phone_number?.replace(/[\s\-]/g, '') || '',
            displayPhoneNumber: phone.display_phone_number,
            verifiedName: phone.verified_name,
            phoneNumberId: phone.id,
            qualityRating: this.mapQualityRating(phone.quality_rating),
            messagingLimit: phone.messaging_limit_tier,
            status: phone.status === 'CONNECTED' ? 'ACTIVE' : 'PENDING',
            nameStatus: phone.name_status,
            isOfficialBusinessAccount: phone.is_official_business_account || false,
            platformType: phone.platform_type,
            codeVerificationStatus: phone.code_verification_status,
          },
        });
      }
    } catch (error) {
      this.logger.warn(`Failed to fetch phone numbers for WABA ${targetWabaId}: ${error.message}`);
    }

    // 8. الاشتراك في webhooks
    try {
      await this.metaApi.subscribeToWebhooks(targetWabaId, accessToken);
      await this.prisma.developerWhatsappAccount.update({
        where: { id: account.id },
        data: { webhookSubscribed: true },
      });
    } catch (error) {
      this.logger.warn(`Failed to subscribe to webhooks for WABA ${targetWabaId}: ${error.message}`);
    }

    this.logger.log(`WABA ${targetWabaId} connected for user ${userId}`);

    return this.prisma.developerWhatsappAccount.findUnique({
      where: { id: account.id },
      include: { phoneNumbers: true },
    });
  }

  /**
   * قائمة حسابات WABA
   */
  async findAll(userId: string, appId: string) {
    const app = await this.prisma.developerApp.findFirst({
      where: { appId, userId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    return this.prisma.developerWhatsappAccount.findMany({
      where: {
        userId,
        developerAppId: app.id,
      },
      include: {
        phoneNumbers: {
          select: {
            id: true,
            phoneNumber: true,
            phoneNumberId: true,
            displayPhoneNumber: true,
            verifiedName: true,
            qualityRating: true,
            messagingLimit: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * فك ارتباط حساب WABA
   */
  async disconnect(userId: string, appId: string, accountId: string) {
    const app = await this.prisma.developerApp.findFirst({
      where: { appId, userId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    const account = await this.prisma.developerWhatsappAccount.findFirst({
      where: {
        id: accountId,
        userId,
        developerAppId: app.id,
      },
    });

    if (!account) throw new NotFoundException('WABA account not found');

    await this.prisma.developerWhatsappAccount.update({
      where: { id: accountId },
      data: {
        status: 'DISCONNECTED',
        disconnectedAt: new Date(),
        accessTokenEncrypted: null,
      },
    });

    this.logger.log(`WABA ${account.wabaId} disconnected for user ${userId}`);

    return { success: true };
  }

  /**
   * تحديث حالة WABA (مزامنة مع Meta)
   */
  async refresh(userId: string, appId: string, accountId: string) {
    const app = await this.prisma.developerApp.findFirst({
      where: { appId, userId, status: 'ACTIVE' },
      select: { id: true },
    });

    if (!app) {
      throw new NotFoundException('App not found');
    }

    const account = await this.prisma.developerWhatsappAccount.findFirst({
      where: {
        id: accountId,
        userId,
        developerAppId: app.id,
      },
    });

    if (!account) throw new NotFoundException('WABA account not found');
    if (!account.accessTokenEncrypted) {
      throw new BadRequestException('Account is disconnected. Please reconnect.');
    }

    const accessToken = this.tokenEncryption.decrypt(account.accessTokenEncrypted);

    // تحديث معلومات WABA
    const wabaInfo = await this.metaApi.getWabaInfo(account.wabaId, accessToken);

    // تحديث أرقام الهاتف
    const phoneData = await this.metaApi.getPhoneNumbers(account.wabaId, accessToken);

    for (const phone of phoneData.data || []) {
      await this.prisma.developerPhoneNumber.upsert({
        where: { phoneNumberId: phone.id },
        update: {
          qualityRating: this.mapQualityRating(phone.quality_rating),
          messagingLimit: phone.messaging_limit_tier,
          status: phone.status === 'CONNECTED' ? 'ACTIVE' : 'PENDING',
          nameStatus: phone.name_status,
          verifiedName: phone.verified_name,
        },
        create: {
          accountId: account.id,
          phoneNumber: phone.display_phone_number?.replace(/[\s\-]/g, '') || '',
          displayPhoneNumber: phone.display_phone_number,
          verifiedName: phone.verified_name,
          phoneNumberId: phone.id,
          qualityRating: this.mapQualityRating(phone.quality_rating),
          messagingLimit: phone.messaging_limit_tier,
          status: phone.status === 'CONNECTED' ? 'ACTIVE' : 'PENDING',
          nameStatus: phone.name_status,
          platformType: phone.platform_type,
        },
      });
    }

    return this.prisma.developerWhatsappAccount.findUnique({
      where: { id: accountId },
      include: { phoneNumbers: true },
    });
  }

  /**
   * فك تشفير access token لحساب WABA
   */
  async getDecryptedToken(accountId: string): Promise<string> {
    const account = await this.prisma.developerWhatsappAccount.findUnique({
      where: { id: accountId },
      select: { accessTokenEncrypted: true, status: true },
    });

    if (!account || !account.accessTokenEncrypted || account.status !== 'ACTIVE') {
      throw new BadRequestException('WABA account is not available');
    }

    return this.tokenEncryption.decrypt(account.accessTokenEncrypted);
  }

  /**
   * الحصول على Embedded Signup config
   */
  getEmbeddedSignupConfig() {
    return {
      appId: this.configService.get('WHATSAPP_APP_ID'),
      configId: this.configService.get('WHATSAPP_CONFIG_ID'),
    };
  }

  private mapQualityRating(rating: string): any {
    const map: Record<string, string> = {
      GREEN: 'GREEN',
      YELLOW: 'YELLOW',
      RED: 'RED',
    };
    return map[rating] || 'UNKNOWN';
  }
}

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { MetaApiService } from '../shared/meta-api.service';
import { TokenEncryptionService } from '../shared/token-encryption.service';
import { RegisterPhoneDto, UpdatePhoneProfileDto } from './dto/phone-number.dto';
import { SendTestMessageDto } from './dto/send-test-message.dto';
import type { Prisma } from '@prisma/client';

@Injectable()
export class PhoneNumbersService {
  private readonly logger = new Logger(PhoneNumbersService.name);

  constructor(
    private prisma: PrismaService,
    private metaApi: MetaApiService,
    private tokenEncryption: TokenEncryptionService,
  ) {}

  /**
   * Resolve phone by UUID or phoneNumberId
   */
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

  private phoneWhere(phoneId: string, userId: string, developerAppId: string): Prisma.DeveloperPhoneNumberWhereInput {
    return {
      OR: [
        { id: phoneId },
        { phoneNumberId: phoneId },
      ],
      account: {
        is: {
          userId,
          developerAppId,
        },
      },
    };
  }

  /**
   * قائمة أرقام الهاتف
   */
  async findAll(userId: string, appId: string) {
    const developerAppId = await this.resolveDeveloperAppId(userId, appId);

    return this.prisma.developerPhoneNumber.findMany({
      where: {
        account: {
          is: {
            userId,
            status: 'ACTIVE',
            developerAppId,
          },
        },
      },
      include: {
        account: {
          select: { id: true, businessName: true, wabaId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * تفاصيل رقم هاتف
   */
  async findOne(userId: string, appId: string, phoneId: string) {
    const developerAppId = await this.resolveDeveloperAppId(userId, appId);
    const phone = await this.prisma.developerPhoneNumber.findFirst({
      where: this.phoneWhere(phoneId, userId, developerAppId),
      include: {
        account: {
          select: { id: true, businessName: true, wabaId: true },
        },
      },
    });

    if (!phone) throw new NotFoundException('Phone number not found');
    return phone;
  }

  /**
   * تسجيل رقم هاتف
   */
  async register(userId: string, appId: string, phoneId: string, dto: RegisterPhoneDto) {
    const developerAppId = await this.resolveDeveloperAppId(userId, appId);
    const phone = await this.prisma.developerPhoneNumber.findFirst({
      where: this.phoneWhere(phoneId, userId, developerAppId),
      include: {
        account: true,
      },
    });

    if (!phone) throw new NotFoundException('Phone number not found');
    if (!phone.account.accessTokenEncrypted) {
      throw new BadRequestException('WABA account token not available');
    }

    const accessToken = this.tokenEncryption.decrypt(phone.account.accessTokenEncrypted);

    try {
      await this.metaApi.registerPhoneNumber(phone.phoneNumberId, accessToken, dto.pin);

      await this.prisma.developerPhoneNumber.update({
        where: { id: phone.id },
        data: { status: 'ACTIVE' },
      });

      return { success: true, status: 'ACTIVE' };
    } catch (error) {
      const errorData = error.response?.data?.error || {};
      throw new BadRequestException({
        message: 'Failed to register phone number',
        error: errorData.message || error.message,
      });
    }
  }

  /**
   * تحديث بروفايل الرقم
   */
  async updateProfile(userId: string, appId: string, phoneId: string, dto: UpdatePhoneProfileDto) {
    const developerAppId = await this.resolveDeveloperAppId(userId, appId);
    const phone = await this.prisma.developerPhoneNumber.findFirst({
      where: this.phoneWhere(phoneId, userId, developerAppId),
      include: {
        account: true,
      },
    });

    if (!phone) throw new NotFoundException('Phone number not found');
    if (!phone.account.accessTokenEncrypted) {
      throw new BadRequestException('WABA account token not available');
    }

    const accessToken = this.tokenEncryption.decrypt(phone.account.accessTokenEncrypted);

    try {
      // Build Meta profile payload (profile_picture_url is read-only in Meta API;
      // picture requires file upload via profile_picture_handle, so we skip it here)
      const metaPayload: Record<string, any> = {};
      if (dto.about !== undefined) metaPayload.about = dto.about;
      if (dto.address !== undefined) metaPayload.address = dto.address;
      if (dto.description !== undefined) metaPayload.description = dto.description;
      if (dto.email !== undefined) metaPayload.email = dto.email;
      if (dto.websites !== undefined) metaPayload.websites = dto.websites;

      if (Object.keys(metaPayload).length > 0) {
        await this.metaApi.updateBusinessProfile(phone.phoneNumberId, accessToken, metaPayload);
      }

      // تحديث محلي (includes profilePictureUrl for local display)
      await this.prisma.developerPhoneNumber.update({
        where: { id: phone.id },
        data: {
          aboutText: dto.about,
          profilePictureUrl: dto.profilePictureUrl,
          address: dto.address,
          description: dto.description,
          email: dto.email,
          websites: dto.websites ?? undefined,
        },
      });

      return { success: true };
    } catch (error) {
      const errorData = error.response?.data?.error || {};
      throw new BadRequestException({
        message: 'Failed to update profile',
        error: errorData.message || error.message,
      });
    }
  }

  async sendTestMessage(userId: string, appId: string, phoneId: string, dto: SendTestMessageDto) {
    const developerAppId = await this.resolveDeveloperAppId(userId, appId);
    const phone = await this.prisma.developerPhoneNumber.findFirst({
      where: this.phoneWhere(phoneId, userId, developerAppId),
      include: { account: true },
    });

    if (!phone) throw new NotFoundException('Phone number not found');
    if (phone.status !== 'ACTIVE') {
      throw new BadRequestException('Phone number must be active/registered before sending test messages');
    }
    if (!phone.account.accessTokenEncrypted) {
      throw new BadRequestException('WABA account token not available');
    }

    const accessToken = this.tokenEncryption.decrypt(phone.account.accessTokenEncrypted);
    const to = dto.to.replace(/[\s\-\(\)\+]/g, '');

    // Find an approved template for this WABA account
    const approvedTemplate = await this.prisma.developerWhatsappTemplate.findFirst({
      where: {
        accountId: phone.accountId,
        status: 'APPROVED',
      },
      orderBy: { createdAt: 'asc' },
    });

    if (!approvedTemplate) {
      throw new BadRequestException(
        'لا توجد قوالب معتمدة. يرجى مزامنة القوالب أولاً من صفحة القوالب، أو إنشاء قالب جديد والانتظار حتى تتم الموافقة عليه من Meta.',
      );
    }

    try {
      const result = await this.metaApi.sendMessage(phone.phoneNumberId, accessToken, {
        messaging_product: 'whatsapp',
        to,
        type: 'template',
        template: {
          name: approvedTemplate.name,
          language: { code: approvedTemplate.language },
        },
      });

      this.logger.log(`Test message sent from ${phone.phoneNumber} to ${to} using template "${approvedTemplate.name}"`);

      return {
        success: true,
        messageId: result.messages?.[0]?.id || null,
        to,
        from: phone.displayPhoneNumber || phone.phoneNumber,
        template: approvedTemplate.name,
      };
    } catch (error) {
      const errorData = error.response?.data?.error || {};
      this.logger.error(
        `Failed to send test message from ${phone.phoneNumber} to ${to}: ` +
        `code=${errorData.code} subcode=${errorData.error_subcode} ` +
        `message=${errorData.message || error.message}`,
      );
      throw new BadRequestException({
        message: 'Failed to send test message',
        error: errorData.message || error.message,
        code: errorData.code,
        subcode: errorData.error_subcode,
      });
    }
  }
}

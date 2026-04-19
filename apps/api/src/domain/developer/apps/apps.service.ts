import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { SendAppOtpDto } from './dto/app-otp.dto';
import { DEVELOPER_PLAN_LIMITS } from '../subscriptions/dev-plan-limits.config';
import { WhatsAppBusinessService } from '../../../integrations/whatsapp-business/whatsapp-business.service';
import { randomInt } from 'crypto';
import * as bcrypt from 'bcryptjs';

const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_COOLDOWN_SECONDS = 60;
const BCRYPT_ROUNDS = 10;

@Injectable()
export class AppsService {
  private readonly logger = new Logger(AppsService.name);

  constructor(
    private prisma: PrismaService,
    private whatsapp: WhatsAppBusinessService,
  ) {}

  /**
   * Generate a unique 16-digit snowflake-like numeric ID
   */
  private generateAppId(): string {
    const timestamp = Date.now().toString();
    const randomPart = randomInt(100, 999).toString();
    return (timestamp + randomPart).slice(0, 16);
  }

  /**
   * Generate a 6-digit OTP code
   */
  private generateOtpCode(): string {
    return randomInt(100000, 999999).toString();
  }

  /* ────────── OTP: Send ────────── */

  async sendOtp(userId: string, dto: SendAppOtpDto) {
    // Rate limiting: check cooldown
    const recent = await this.prisma.whatsappOtp.findFirst({
      where: {
        userId,
        phoneNumber: dto.phoneNumber,
        type: 'APP_VERIFICATION',
        createdAt: { gte: new Date(Date.now() - OTP_COOLDOWN_SECONDS * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recent) {
      const waitSeconds = Math.ceil(
        (recent.createdAt.getTime() + OTP_COOLDOWN_SECONDS * 1000 - Date.now()) / 1000,
      );
      throw new BadRequestException(
        `Please wait ${waitSeconds} seconds before requesting a new code.`,
      );
    }

    const code = this.generateOtpCode();
    const codeHash = await bcrypt.hash(code, BCRYPT_ROUNDS);

    // Send OTP via WhatsApp
    await this.whatsapp.sendOtp(dto.phoneNumber, code);

    // Store OTP record
    await this.prisma.whatsappOtp.create({
      data: {
        userId,
        phoneNumber: dto.phoneNumber,
        codeHash,
        type: 'APP_VERIFICATION',
        sentVia: 'WHATSAPP',
        expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
      },
    });

    this.logger.log(`App verification OTP sent to ${dto.phoneNumber.slice(0, 4)}*** for user ${userId}`);
    return { sent: true, expiresInSeconds: OTP_EXPIRY_MINUTES * 60 };
  }

  /* ────────── OTP: Verify (internal) ────────── */

  private async verifyOtp(userId: string, phoneNumber: string, code: string): Promise<boolean> {
    const otp = await this.prisma.whatsappOtp.findFirst({
      where: {
        userId,
        phoneNumber,
        type: 'APP_VERIFICATION',
        verified: false,
        expiresAt: { gte: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('No valid OTP found. Please request a new code.');
    }

    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      throw new BadRequestException('Too many attempts. Please request a new code.');
    }

    // Increment attempts
    await this.prisma.whatsappOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    const isValid = await bcrypt.compare(code, otp.codeHash);
    if (!isValid) {
      throw new BadRequestException('Invalid code. Please try again.');
    }

    // Mark verified
    await this.prisma.whatsappOtp.update({
      where: { id: otp.id },
      data: { verified: true, verifiedAt: new Date() },
    });

    return true;
  }

  /* ────────── OTP: Verify (public endpoint) ────────── */

  async verifyOtpEndpoint(userId: string, dto: { phoneNumber: string; code: string }) {
    await this.verifyOtp(userId, dto.phoneNumber, dto.code);
    return { verified: true };
  }

  /* ────────── Create App ────────── */

  async create(userId: string, dto: CreateAppDto) {
    await this.checkAppLimit(userId);

    // Verify OTP before creating app
    // Extract phone from the most recent verified OTP for this user
    const verifiedOtp = await this.prisma.whatsappOtp.findFirst({
      where: {
        userId,
        type: 'APP_VERIFICATION',
        verified: true,
        verifiedAt: { gte: new Date(Date.now() - 10 * 60 * 1000) }, // within 10 minutes
      },
      orderBy: { verifiedAt: 'desc' },
    });

    if (!verifiedOtp) {
      throw new ForbiddenException('Phone verification required. Please verify your phone number first.');
    }

    let appId: string;
    let retries = 0;
    do {
      appId = this.generateAppId();
      const exists = await this.prisma.developerApp.findUnique({
        where: { appId },
      });
      if (!exists) break;
      retries++;
    } while (retries < 5);

    const app = await this.prisma.$transaction(async (tx) => {
      const createdApp = await tx.developerApp.create({
        data: {
          appId,
          userId,
          name: dto.name,
          contactEmail: dto.contactEmail,
          appType: dto.appType,
          description: dto.description,
          businessId: dto.businessId,
          icon: dto.icon,
          verified: true,
        },
        select: {
          id: true,
          appId: true,
          name: true,
          contactEmail: true,
          appType: true,
          description: true,
          businessId: true,
          icon: true,
          status: true,
          verified: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      await tx.developerAppWallet.create({
        data: {
          developerAppId: createdApp.id,
        },
      });

      return createdApp;
    });

    this.logger.log(`App created: ${app.appId} for user ${userId}`);
    return app;
  }

  async findAll(userId: string) {
    return this.prisma.developerApp.findMany({
      where: { userId, status: { not: 'DELETED' } },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        appId: true,
        name: true,
        contactEmail: true,
        appType: true,
        description: true,
        businessId: true,
        icon: true,
        status: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async findOne(userId: string, appId: string) {
    const app = await this.prisma.developerApp.findFirst({
      where: { appId, userId, status: { not: 'DELETED' } },
      select: {
        id: true,
        appId: true,
        name: true,
        contactEmail: true,
        appType: true,
        description: true,
        businessId: true,
        icon: true,
        status: true,
        verified: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    if (!app) throw new NotFoundException('App not found');
    return app;
  }

  async update(userId: string, appId: string, dto: UpdateAppDto) {
    const app = await this.prisma.developerApp.findFirst({
      where: { appId, userId, status: { not: 'DELETED' } },
    });
    if (!app) throw new NotFoundException('App not found');

    return this.prisma.developerApp.update({
      where: { id: app.id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.businessId !== undefined && { businessId: dto.businessId }),
        ...(dto.icon !== undefined && { icon: dto.icon }),
      },
      select: {
        id: true,
        appId: true,
        name: true,
        description: true,
        businessId: true,
        icon: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async remove(userId: string, appId: string) {
    const app = await this.prisma.developerApp.findFirst({
      where: { appId, userId, status: { not: 'DELETED' } },
    });
    if (!app) throw new NotFoundException('App not found');

    await this.prisma.developerApp.update({
      where: { id: app.id },
      data: { status: 'DELETED' },
    });

    this.logger.log(`App soft-deleted: ${appId} by user ${userId}`);
    return { success: true };
  }

  private async checkAppLimit(userId: string) {
    const subscription = await this.prisma.developerSubscription.findUnique({
      where: { userId },
      select: { plan: true, appsLimit: true },
    });

    const limit =
      subscription?.appsLimit ??
      (DEVELOPER_PLAN_LIMITS[subscription?.plan || 'FREE'] as any)?.maxApps ??
      3;

    const currentCount = await this.prisma.developerApp.count({
      where: { userId, status: 'ACTIVE' },
    });

    if (currentCount >= limit) {
      throw new ForbiddenException(
        `App limit reached (${limit}). Upgrade your plan for more.`,
      );
    }
  }
}

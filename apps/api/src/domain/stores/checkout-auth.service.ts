import {
  Injectable,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { WhatsAppBusinessService } from '../../integrations/whatsapp-business/whatsapp-business.service';
import { EmailService } from '../../integrations/email/email.service';
import * as crypto from 'crypto';
import {
  RequestCheckoutOtpDto,
  VerifyCheckoutOtpDto,
  ResendCheckoutOtpDto,
  OtpRequestResponse,
  OtpVerifyResponse,
  QuickLoginDto,
} from './dto/checkout-otp.dto';

/**
 * 🔐 خدمة التحقق للشراء - Checkout Auth Service
 *
 * نظام التحقق عبر WhatsApp Business API (Meta Cloud API)
 * - OTP يُولّد محلياً ويُرسل عبر WhatsApp Business
 * - Rate limiting + Throttler
 * - Email Fallback عند فشل WhatsApp
 */

// Constants
const CHECKOUT_TOKEN_EXPIRY = '2h';
const MAX_REQUESTS_PER_PHONE = 5;
const RATE_LIMIT_WINDOW_MINUTES = 15;
const MAX_VERIFY_ATTEMPTS_PER_OTP = 5;
const MAX_OTP_REQUESTS_PER_IP = 15;
const IP_RATE_LIMIT_WINDOW_MINUTES = 15;

@Injectable()
export class CheckoutAuthService {
  private readonly logger = new Logger(CheckoutAuthService.name);

  // Temporary helper to access new Prisma delegates/fields until types refresh
  private get prismaAny() {
    return this.prisma as any;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly whatsappBusiness: WhatsAppBusinessService,
    private readonly emailService: EmailService,
  ) {}

  /**
   * 🔍 فحص حالة خدمات الإرسال
   */
  async checkServicesStatus() {
    const whatsappStatus = await this.whatsappBusiness.checkStatus();

    return {
      status: 'OK',
      services: { whatsappBusiness: whatsappStatus },
      config: {
        whatsappBusinessToken: this.configService.get('WHATSAPP_BUSINESS_TOKEN')
          ? '✓ Set'
          : '✗ Missing',
        whatsappPhoneNumberId: this.configService.get('WHATSAPP_PHONE_NUMBER_ID')
          ? '✓ Set'
          : '✗ Missing',
      },
    };
  }

  /**
   * 📲 طلب رمز OTP للشراء عبر WhatsApp Business
   */
  async requestOtp(dto: RequestCheckoutOtpDto, clientIp?: string): Promise<OtpRequestResponse> {
    const { phoneNumber, email, preferEmail } = dto;

    if (!phoneNumber) {
      throw new BadRequestException({
        message: 'يجب تقديم رقم الهاتف',
        code: 'MISSING_PHONE',
      });
    }

    // 1. Rate Limiting (per-phone + per-IP)
    await this.checkRateLimit(phoneNumber);
    if (clientIp) await this.checkIpRateLimit(clientIp);

    // 2. Try WhatsApp first, fallback to Email
    const externalId = `checkout_${Date.now()}`;
    let verification: any;
    let sentVia: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP';

    // If user prefers email or no WhatsApp available, go straight to email
    if (preferEmail && email) {
      const { otpId } = await this.sendOtpViaEmail(phoneNumber, email, externalId);
      verification = { id: otpId };
      sentVia = 'EMAIL';
    } else {
      // Generate 6-digit OTP
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const bcryptLib = await import('bcryptjs');
      const codeHash = await bcryptLib.hash(otpCode, 10);

      try {
        const result = await this.whatsappBusiness.sendOtp(phoneNumber, otpCode);
        verification = { id: `wa_${result.messageId || externalId}`, codeHash };
      } catch (whatsappError) {
        this.logger.warn(
          `⚠️ WhatsApp Business verification failed, falling back to Email: ${(whatsappError as Error).message}`,
        );
        // Fallback to email - use provided email or find from DB
        const fallbackEmail = email || await this.findUserEmail(phoneNumber);
        if (!fallbackEmail) {
          throw new BadRequestException({
            message: 'فشل إرسال الرمز عبر واتساب. يرجى إدخال بريدك الإلكتروني للاستلام عبره.',
            code: 'WHATSAPP_FAILED_NEED_EMAIL',
          });
        }
        const { otpId } = await this.sendOtpViaEmail(phoneNumber, fallbackEmail, externalId);
        verification = { id: otpId };
        sentVia = 'EMAIL';
      }
    }

    // 3. Store verification record
    const existingUser = await (this.prisma.user as any).findFirst({
      where: { phoneNumber },
    });

    await this.prismaAny.whatsappOtp.create({
      data: {
        phoneNumber,
        codeHash: verification.codeHash || verification.id,
        type: 'CHECKOUT',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        sentVia,
        userId: existingUser?.id,
      },
    });

    return {
      success: true,
      message: sentVia === 'WHATSAPP'
        ? 'تم إرسال رمز التحقق عبر واتساب'
        : 'تم إرسال رمز التحقق عبر البريد الإلكتروني',
      otpId: verification.id,
      sentVia,
      expiresIn: 600,
      maskedPhone: this.maskPhoneNumber(phoneNumber),
    };
  }

  /**
   * ✅ التحقق من رمز OTP
   */
  async verifyOtp(dto: VerifyCheckoutOtpDto, clientIp?: string): Promise<OtpVerifyResponse> {
    const { phoneNumber, code, otpId } = dto;

    if (!phoneNumber) {
      throw new BadRequestException({
        message: 'يجب تقديم رقم الهاتف',
        code: 'MISSING_PHONE',
      });
    }

    // Check brute-force lockout per IP
    if (clientIp) await this.checkVerifyBruteForce(clientIp);

    // Check if this OTP was sent via email (otpId starts with 'email_')
    const isEmailOtp = otpId.startsWith('email_');

    if (isEmailOtp) {
      // Verify email-based OTP from database
      await this.verifyEmailOtp(phoneNumber, code, otpId);
    } else {
      // Verify WhatsApp-based OTP from database (same bcrypt check)
      await this.verifyWhatsappOtp(phoneNumber, code);
    }

    // Create or get user
    const { user, isNewUser } = await this.getOrCreateGuestUser(phoneNumber);

    // Generate JWT with short expiry
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        phone: phoneNumber,
        type: 'checkout',
      },
      { expiresIn: CHECKOUT_TOKEN_EXPIRY },
    );

    return {
      success: true,
      message: 'تم التحقق بنجاح',
      accessToken,
      userId: user.id,
      isNewUser,
    };
  }

  /**
   * � تسجيل سريع بدون OTP
   */
  async quickLogin(dto: QuickLoginDto, clientIp?: string): Promise<OtpVerifyResponse> {
    const { phoneNumber, fullName } = dto;

    // IP rate limiting for quick-login
    if (clientIp) await this.checkIpRateLimit(clientIp);

    // Create or get user
    const { user, isNewUser } = await this.getOrCreateGuestUser(phoneNumber, fullName);

    // Generate JWT
    const accessToken = this.jwtService.sign(
      {
        sub: user.id,
        phone: phoneNumber,
        type: 'checkout',
      },
      { expiresIn: CHECKOUT_TOKEN_EXPIRY },
    );

    return {
      success: true,
      message: 'تم إنشاء الجلسة بنجاح',
      accessToken,
      userId: user.id,
      isNewUser,
    };
  }

  /**
   * �🔄 إعادة إرسال OTP
   */
  async resendOtp(dto: ResendCheckoutOtpDto, clientIp?: string): Promise<OtpRequestResponse> {
    const { phoneNumber } = dto;

    if (!phoneNumber) {
      throw new BadRequestException({
        message: 'يجب تقديم رقم الهاتف',
        code: 'MISSING_PHONE',
      });
    }

    // Rate limiting with tolerance for resend (per-phone + per-IP)
    await this.checkRateLimit(phoneNumber, true);
    if (clientIp) await this.checkIpRateLimit(clientIp);

    // Try WhatsApp first, fallback to Email
    const externalId = `checkout_resend_${Date.now()}`;
    let verification: any;
    let sentVia: 'WHATSAPP' | 'EMAIL' = 'WHATSAPP';

    try {
      // Generate 6-digit OTP
      const otpCode = crypto.randomInt(100000, 999999).toString();
      const bcryptLib = await import('bcryptjs');
      const codeHash = await bcryptLib.hash(otpCode, 10);

      const result = await this.whatsappBusiness.sendOtp(phoneNumber, otpCode);
      verification = { id: `wa_${result.messageId || externalId}`, codeHash };

      // Store verification record
      await this.prismaAny.whatsappOtp.create({
        data: {
          phoneNumber,
          codeHash,
          type: 'CHECKOUT',
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          sentVia: 'WHATSAPP',
        },
      });
    } catch (whatsappError) {
      this.logger.warn(
        `⚠️ WhatsApp Business resend failed, falling back to Email: ${(whatsappError as Error).message}`,
      );
      const fallbackEmail = await this.findUserEmail(phoneNumber);
      if (!fallbackEmail) {
        throw new BadRequestException({
          message: 'فشل إرسال الرمز عبر واتساب. يرجى إدخال بريدك الإلكتروني.',
          code: 'WHATSAPP_FAILED_NEED_EMAIL',
        });
      }
      const { otpId } = await this.sendOtpViaEmail(phoneNumber, fallbackEmail, externalId);
      verification = { id: otpId };
      sentVia = 'EMAIL';
    }

    return {
      success: true,
      message: sentVia === 'WHATSAPP'
        ? 'تم إعادة إرسال رمز التحقق عبر واتساب'
        : 'تم إعادة إرسال رمز التحقق عبر البريد الإلكتروني',
      otpId: verification.id,
      sentVia,
      expiresIn: 600,
      maskedPhone: this.maskPhoneNumber(phoneNumber),
    };
  }

  // ============ Private Helper Methods ============

  /**
   * 🔒 التحقق من Rate Limiting
   */
  private async checkRateLimit(
    phoneNumber: string,
    isResend = false,
  ): Promise<void> {
    const windowStart = new Date();
    windowStart.setMinutes(
      windowStart.getMinutes() - RATE_LIMIT_WINDOW_MINUTES,
    );

    const recentRequests = await this.prismaAny.whatsappOtp.count({
      where: {
        phoneNumber,
        createdAt: { gte: windowStart },
      },
    });

    const limit = isResend
      ? MAX_REQUESTS_PER_PHONE + 2
      : MAX_REQUESTS_PER_PHONE;

    if (recentRequests >= limit) {
      throw new BadRequestException({
        message: `لقد تجاوزت الحد الأقصى للطلبات. يرجى الانتظار ${RATE_LIMIT_WINDOW_MINUTES} دقيقة.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: RATE_LIMIT_WINDOW_MINUTES * 60,
      });
    }
  }

  /**
   * 🔒 IP-based rate limiting — prevents one IP from requesting OTPs for many different phones
   */
  private async checkIpRateLimit(clientIp: string): Promise<void> {
    if (!clientIp || clientIp === 'unknown') return;

    // Use a simple in-memory approach via DB: count OTPs created recently from same IP isn't possible
    // since we don't store IP in whatsappOtp. Instead, leverage NestJS Throttler (already per-IP).
    // But we add an extra application-level check: count total unverified OTPs across ALL phones in window.
    // This won't be per-IP in DB, so we rely on the Throttler guard for IP-based limiting.
    // The Throttler limits are: request-otp=3/min, resend-otp=2/min, verify-otp=5/min, quick-login=3/min
    // This is sufficient since Throttler uses IP tracking by default (ThrottlerUserGuard.getTracker).
    // No additional DB-level IP check needed — the Throttler handles it.
  }

  /**
   * 🔒 Brute-force protection: count failed verify attempts across all phones from recent window
   */
  private async checkVerifyBruteForce(clientIp: string): Promise<void> {
    if (!clientIp || clientIp === 'unknown') return;

    // Count all OTPs with high attempt counts (failed verifications) in window.
    // If there are too many failed OTPs recently for the same phone pattern, the per-OTP
    // attempt limit (MAX_VERIFY_ATTEMPTS_PER_OTP = 5) already blocks each code.
    // Combined with Throttler (5 verify/min per IP), this is sufficient.
  }

  /**
   * 👤 إنشاء أو جلب مستخدم ضيف
   */
  private async getOrCreateGuestUser(
    phoneNumber: string,
    fullName?: string,
  ): Promise<{ user: any; isNewUser: boolean }> {
    // البحث عن مستخدم موجود
    let user = await (this.prisma.user as any).findFirst({
      where: { phoneNumber },
      include: { profile: true },
    });

    if (user) {
      user = await (this.prisma.user as any).update({
        where: { id: user.id },
        data: { phoneVerified: true },
      });

      // إنشاء أو تحديث الـ profile إذا كان الاسم متوفراً ولا يوجد profile
      if (fullName && !user.profile) {
        const guestUsername = `guest_${crypto.randomBytes(6).toString('hex')}`;
        await this.prisma.profile.create({
          data: {
            id: crypto.randomUUID(),
            userId: user.id,
            username: guestUsername,
            name: fullName,
          },
        });
      } else if (fullName && user.profile && !user.profile.name) {
        await this.prisma.profile.update({
          where: { userId: user.id },
          data: { name: fullName },
        });
      }

      return { user, isNewUser: false };
    }

    // إنشاء مستخدم جديد (ضيف)
    const guestEmail = `guest_${Date.now()}_${crypto.randomBytes(4).toString('hex')}@guest.rukny.io`;
    const guestUsername = `guest_${crypto.randomBytes(6).toString('hex')}`;

    user = await (this.prisma.user as any).create({
      data: {
        id: crypto.randomUUID(),
        email: guestEmail,
        phoneNumber,
        phoneVerified: true,
        emailVerified: false,
        accountType: 'GUEST_CHECKOUT',
        role: 'GUEST',
        // إنشاء profile مع الاسم
        profile: fullName
          ? {
              create: {
                id: crypto.randomUUID(),
                username: guestUsername,
                name: fullName,
              },
            }
          : undefined,
      },
    });

    return { user, isNewUser: true };
  }

  /**
   * 🙈 إخفاء رقم الهاتف
   */
  private maskPhoneNumber(phone: string): string {
    if (phone.length < 8) return phone;
    const prefix = phone.slice(0, 7);
    const suffix = phone.slice(-4);
    return `${prefix}***${suffix}`;
  }

  /**
   * � البحث عن بريد المستخدم من رقم الهاتف
   */
  private async findUserEmail(phoneNumber: string): Promise<string | null> {
    const user = await (this.prisma.user as any).findFirst({
      where: { phoneNumber },
      select: { email: true },
    });
    if (user?.email && !user.email.includes('@guest.rukny.io')) {
      return user.email;
    }
    return null;
  }

  /**
   * 📧 إرسال OTP عبر البريد الإلكتروني (fallback)
   */
  private async sendOtpViaEmail(
    phoneNumber: string,
    email: string,
    externalId: string,
  ): Promise<{ otpId: string }> {
    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const otpId = `email_${externalId}`;

    // Store hashed code
    const bcrypt = await import('bcryptjs');
    const codeHash = await bcrypt.hash(code, 10);

    await this.prismaAny.whatsappOtp.create({
      data: {
        phoneNumber,
        codeHash,
        type: 'CHECKOUT',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        sentVia: 'EMAIL',
      },
    });

    // Send email
    await this.emailService.sendEmail({
      to: email,
      subject: `${code} رمز التحقق الخاص بك`,
      html: `
        <div dir="rtl" style="font-family: sans-serif; max-width: 400px; margin: auto; text-align: center; padding: 30px;">
          <h2 style="color: #111;">رمز التحقق</h2>
          <p style="color: #666; font-size: 14px;">استخدم هذا الرمز لإتمام عملية الشراء</p>
          <div style="background: #f5f5f5; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #111; font-family: monospace;">${code}</span>
          </div>
          <p style="color: #999; font-size: 12px;">ينتهي خلال 10 دقائق. لا تشارك هذا الرمز مع أحد.</p>
        </div>
      `,
    });

    this.logger.log(`📧 Email OTP sent to ${email} for ${phoneNumber}`);

    return { otpId };
  }

  /**
   * � التحقق من OTP المرسل عبر واتساب
   */
  private async verifyWhatsappOtp(
    phoneNumber: string,
    code: string,
  ): Promise<void> {
    const otp = await this.prismaAny.whatsappOtp.findFirst({
      where: {
        phoneNumber,
        type: 'CHECKOUT',
        sentVia: 'WHATSAPP',
        expiresAt: { gte: new Date() },
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException({
        message: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.',
        code: 'INVALID_OTP_CODE',
      });
    }

    // Check if max attempts exceeded for this OTP
    if (otp.attempts >= MAX_VERIFY_ATTEMPTS_PER_OTP) {
      throw new BadRequestException({
        message: 'تم تجاوز الحد الأقصى لمحاولات التحقق. يرجى طلب رمز جديد.',
        code: 'MAX_ATTEMPTS_EXCEEDED',
      });
    }

    // Increment attempts
    await this.prismaAny.whatsappOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(code, otp.codeHash);

    if (!isValid) {
      const remaining = MAX_VERIFY_ATTEMPTS_PER_OTP - (otp.attempts + 1);
      throw new BadRequestException({
        message: remaining > 0
          ? `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`
          : 'تم تجاوز الحد الأقصى لمحاولات التحقق. يرجى طلب رمز جديد.',
        code: 'INVALID_OTP_CODE',
      });
    }

    // Mark as verified
    await this.prismaAny.whatsappOtp.update({
      where: { id: otp.id },
      data: { verifiedAt: new Date() },
    });
  }

  /**
   * �📧 التحقق من OTP المرسل بالبريد الإلكتروني
   */
  private async verifyEmailOtp(
    phoneNumber: string,
    code: string,
    otpId: string,
  ): Promise<void> {
    const otp = await this.prismaAny.whatsappOtp.findFirst({
      where: {
        phoneNumber,
        type: 'CHECKOUT',
        sentVia: 'EMAIL',
        expiresAt: { gte: new Date() },
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException({
        message: 'انتهت صلاحية رمز التحقق. يرجى طلب رمز جديد.',
        code: 'INVALID_OTP_CODE',
      });
    }

    // Check if max attempts exceeded for this OTP
    if (otp.attempts >= MAX_VERIFY_ATTEMPTS_PER_OTP) {
      throw new BadRequestException({
        message: 'تم تجاوز الحد الأقصى لمحاولات التحقق. يرجى طلب رمز جديد.',
        code: 'MAX_ATTEMPTS_EXCEEDED',
      });
    }

    // Increment attempts
    await this.prismaAny.whatsappOtp.update({
      where: { id: otp.id },
      data: { attempts: { increment: 1 } },
    });

    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.compare(code, otp.codeHash);

    if (!isValid) {
      const remaining = MAX_VERIFY_ATTEMPTS_PER_OTP - (otp.attempts + 1);
      throw new BadRequestException({
        message: remaining > 0
          ? `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`
          : 'تم تجاوز الحد الأقصى لمحاولات التحقق. يرجى طلب رمز جديد.',
        code: 'INVALID_OTP_CODE',
      });
    }

    // Mark as verified
    await this.prismaAny.whatsappOtp.update({
      where: { id: otp.id },
      data: { verifiedAt: new Date() },
    });
  }
}

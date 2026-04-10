import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { SecurityLogService } from '../../infrastructure/security/log.service';
import { SecurityDetectorService } from '../../infrastructure/security/detector.service';
import * as crypto from 'crypto';
import { UAParser } from 'ua-parser-js';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { AccountLockoutService } from './account-lockout.service';
import { IpVerificationService } from './ip-verification.service';
import { SessionFingerprintService } from '../../infrastructure/security/session-fingerprint.service';
import { SubscriptionsService } from '../subscriptions/subscriptions.service';

/**
 * 🔒 Auth Service
 *
 * خدمة المصادقة الرئيسية
 * تتعامل مع OAuth (Google/LinkedIn) وإدارة الجلسات
 */

export interface AuthResult {
  user: {
    id: string;
    email: string;
    role: string;
    name?: string;
    username?: string;
    avatar?: string;
  };
  access_token: string;
  refresh_token?: string;
  needsProfileCompletion: boolean;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private securityLogService: SecurityLogService,
    private securityDetectorService: SecurityDetectorService,
    private notificationsGateway: NotificationsGateway,
    private accountLockoutService: AccountLockoutService,
    private ipVerificationService: IpVerificationService,
    private sessionFingerprintService: SessionFingerprintService,
    private subscriptionsService: SubscriptionsService,
  ) {}

  /**
   * 🔒 تشفير التوكن باستخدام SHA-256
   */
  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * 🔒 إنشاء Refresh Token آمن
   */
  private generateSecureRefreshToken(): string {
    return crypto.randomBytes(64).toString('hex');
  }

  /**
   * 🔒 إنشاء جلسة جديدة مع Access و Refresh tokens
   *
   * ملاحظة: Access Token يحتوي على sid (Session ID) للربط بالجلسة
   * لا نخزن Access Token hash - نستخدم JWT Stateless
   */
  private async createSession(
    userId: string,
    email: string,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    // Parse user agent
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    // 1. إنشاء Session ID
    const sessionId = crypto.randomUUID();

    // 2. إنشاء Access Token مع sid (30 دقيقة)
    const accessToken = this.jwtService.sign(
      { sub: userId, sid: sessionId, email, type: 'access' },
      { expiresIn: '30m' },
    );

    // 3. إنشاء Refresh Token (7 أيام)
    const refreshToken = this.generateSecureRefreshToken();

    // 4. حساب أوقات الانتهاء
    const sessionExpiresAt = new Date();
    sessionExpiresAt.setMinutes(sessionExpiresAt.getMinutes() + 30);

    const refreshExpiresAt = new Date();
    // 🔒 7 أيام - موحد مع token.service.ts و cookie.config.ts
    refreshExpiresAt.setDate(refreshExpiresAt.getDate() + 7);

    // 5. حفظ الجلسة في قاعدة البيانات
    // ⚠️ لا نخزن Access Token - نستخدم sessionId في JWT
    try {
      await this.prisma.session.create({
        data: {
          id: sessionId,
          user: { connect: { id: userId } }, // استخدام العلاقة بدلاً من userId مباشرة
          // 🔒 فقط Refresh Token Hash
          refreshTokenHash: this.hashToken(refreshToken),
          deviceName: result.device.model || 'Unknown Device',
          deviceType: result.device.type || 'desktop',
          browser: result.browser.name || 'Unknown',
          os: result.os.name || 'Unknown',
          ipAddress,
          userAgent,
          expiresAt: sessionExpiresAt,
          refreshExpiresAt,
          rotationCount: 0,
        },
      });
    } catch (error) {
      // 🔒 Session creation failure should fail the login process
      // Returning tokens without a session would create orphaned tokens
      throw new Error(
        `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // 🔒 Bind session fingerprint for theft detection
    if (userAgent) {
      try {
        const fingerprint = this.sessionFingerprintService.generateSimpleFingerprint({
          'user-agent': userAgent,
        });
        await this.sessionFingerprintService.bindFingerprintToSession(
          sessionId,
          fingerprint,
          userId,
        );
      } catch {
        // Non-critical — don't fail login for fingerprint storage
      }
    }

    return { accessToken, refreshToken };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        profile: {
          select: {
            name: true,
            username: true,
            avatar: true,
          },
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.profile?.name,
      username: user.profile?.username,
      avatar: user.profile?.avatar,
    };
  }

  /**
   * 🔒 Shared OAuth login logic for all providers
   */
  private async oauthLogin(
    provider: 'google' | 'linkedin',
    providerUser: { providerId: string; email: string; name: string; avatar: string | null },
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthResult> {
    const { providerId, email, name, avatar } = providerUser;
    const providerIdField = provider === 'google' ? 'googleId' : 'linkedinId';

    // Prioritize lookup by provider ID, then fall back to email
    let user = await this.prisma.user.findFirst({
      where: { [providerIdField]: providerId },
      include: { profile: true },
    });

    if (!user) {
      user = await this.prisma.user.findFirst({
        where: { email },
        include: { profile: true },
      });
    }

    if (!user) {
      user = await this.prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email,
          [providerIdField]: providerId,
          emailVerified: true,
          profileCompleted: false,
          profile: {
            create: {
              id: crypto.randomUUID(),
              username:
                email.split('@')[0] +
                '_' +
                Math.random().toString(36).substring(2, 6),
              name,
              avatar,
            },
          },
        },
        include: { profile: true },
      });

      // إنشاء اشتراك مجاني للمستخدم الجديد
      await this.subscriptionsService.createFreeSubscription(user.id);
    } else if (!user[providerIdField]) {
      // Link existing user account with this provider
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          [providerIdField]: providerId,
          emailVerified: true,
          profile: user.profile
            ? { update: { avatar: avatar || user.profile.avatar } }
            : {
                create: {
                  id: crypto.randomUUID(),
                  username:
                    email.split('@')[0] +
                    '_' +
                    Math.random().toString(36).substring(2, 6),
                  name,
                  avatar,
                },
              },
        },
        include: { profile: true },
      });
    }

    const { accessToken, refreshToken } = await this.createSession(
      user.id,
      user.email,
      userAgent,
      ipAddress,
    );

    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const providerLabel = provider === 'google' ? 'Google' : 'LinkedIn';

    await this.securityLogService.createLog({
      userId: user.id,
      action: 'LOGIN_SUCCESS',
      status: 'SUCCESS',
      description: `تسجيل دخول ناجح عبر ${providerLabel}`,
      ipAddress,
      deviceType: result.device.type || 'desktop',
      browser: result.browser.name || 'Unknown',
      os: result.os.name || 'Unknown',
      userAgent,
    });

    await this.securityDetectorService.checkNewDevice(user.id, {
      browser: result.browser.name,
      os: result.os.name,
      deviceType: result.device.type || 'desktop',
      ipAddress,
      userAgent,
    });

    try {
      await this.notificationsGateway.sendNotification({
        userId: user.id,
        type: 'NEW_LOGIN' as any,
        title: 'تسجيل دخول جديد',
        message: `تم تسجيل الدخول إلى حسابك من ${result.browser.name || 'متصفح غير معروف'} على ${result.os.name || 'جهاز غير معروف'}`,
        data: {
          browser: result.browser.name || 'Unknown',
          os: result.os.name || 'Unknown',
          deviceType: result.device.type || 'desktop',
        },
      });
    } catch {
      // Non-critical — don't fail login for a notification error
    }

    await this.accountLockoutService.recordSuccessfulAttempt(user.email, ipAddress);

    return {
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.profile?.name,
        username: user.profile?.username,
        avatar: user.profile?.avatar,
      },
      access_token: accessToken,
      refresh_token: refreshToken,
      needsProfileCompletion: !user.profileCompleted,
    };
  }

  async googleLogin(googleUser: any, userAgent?: string, ipAddress?: string) {
    return this.oauthLogin(
      'google',
      {
        providerId: googleUser.googleId,
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.avatar,
      },
      userAgent,
      ipAddress,
    );
  }

  async linkedinLogin(linkedinUser: any, userAgent?: string, ipAddress?: string) {
    return this.oauthLogin(
      'linkedin',
      {
        providerId: linkedinUser.linkedinId,
        email: linkedinUser.email,
        name: linkedinUser.name,
        avatar: linkedinUser.avatar,
      },
      userAgent,
      ipAddress,
    );
  }

  /**
   * 🔒 تسجيل الخروج - إبطال الجلسة بدلاً من حذفها
   * يقبل توكن منتهي الصلاحية لاستخراج sessionId وإبطال الجلسة
   */
  async logout(token: string, userId?: string) {
    try {
      let sessionId: string | undefined;
      try {
        const decoded = this.jwtService.decode(token) as { sid?: string } | null;
        sessionId = decoded?.sid;
      } catch {
        // ignore
      }

      if (!sessionId) {
        return { message: 'Logged out successfully' };
      }

      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
      });

      if (session && !session.isRevoked) {
        await this.prisma.session.update({
          where: { id: sessionId },
          data: {
            isRevoked: true,
            revokedAt: new Date(),
            revokedReason: 'User logout',
          },
        });

        await this.securityLogService.createLog({
          userId: session.userId,
          action: 'LOGOUT',
          status: 'SUCCESS',
          description: 'تسجيل خروج',
          ipAddress: session.ipAddress,
          deviceType: session.deviceType,
          browser: session.browser,
          os: session.os,
        });
      }

      return { message: 'Logged out successfully' };
    } catch {
      return { message: 'Logged out successfully' };
    }
  }
}

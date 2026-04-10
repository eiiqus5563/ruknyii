import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { SessionFingerprintService } from '../../../infrastructure/security/session-fingerprint.service';
import { extractAccessToken } from '../cookie.config';

// ⚡ In-memory throttle map to prevent concurrent lastActivity updates
// Key: sessionId, Value: last update timestamp
const lastActivityUpdateCache = new Map<string, number>();
const ACTIVITY_UPDATE_INTERVAL_MS = 120000; // 2 minutes

// Clean up old entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of lastActivityUpdateCache.entries()) {
    if (now - timestamp > ACTIVITY_UPDATE_INTERVAL_MS * 2) {
      lastActivityUpdateCache.delete(key);
    }
  }
}, 600000);

/**
 * 🔒 JWT Strategy with Session Validation via sid claim
 *
 * تحسينات أمنية:
 * - استخراج Access Token من Cookie أولاً ثم Authorization Header (لدعم SPA مع httpOnly)
 * - استخدام sid (Session ID) من JWT للتحقق من الجلسة
 * - لا نخزن Access Token hash (JWT Stateless)
 * - Revocation سريع عبر isRevoked flag
 *
 * JWT Payload:
 * - sub: userId
 * - sid: sessionId (للتحقق من الجلسة)
 * - email
 * - type: 'access'
 */

/**
 * 🔒 Custom extractor: Cookie أولاً ثم Authorization Header
 */
const bearerExtractor = (req: any): string | null => {
  return extractAccessToken(req);
};

function isLocalhostContext(value?: string | string[] | null): boolean {
  if (!value) return false;
  const normalized = Array.isArray(value) ? value.join(' ') : value;
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|::1/i.test(normalized);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
    private sessionFingerprintService: SessionFingerprintService,
  ) {
    super({
      // 🔒 استخراج من Authorization header فقط
      jwtFromRequest: bearerExtractor,
      // 🔒 Reject expired JWTs — the client must use POST /auth/refresh to renew
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true, // Enable request in validate
    });
  }

  async validate(req: any, payload: any) {
    // 🔒 التحقق من نوع التوكن (يجب أن يكون access وليس refresh)
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type: expected access token');
    }

    // 🔒 التحقق من وجود sid في JWT
    const sessionId = payload.sid;
    if (!sessionId) {
      throw new UnauthorizedException('Invalid token: missing session ID');
    }

    // 🔒 البحث عن الجلسة باستخدام sessionId من JWT
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            phone: true,
            bannerUrls: true,
            profileCompleted: true,
            profile: {
              select: {
                name: true,
                username: true,
                avatar: true,
                bio: true,
              },
            },
            subscription: {
              select: {
                plan: true,
                status: true,
                currentPeriodEnd: true,
              },
            },
          },
        },
      },
    });

    // 🔒 التحقق من وجود الجلسة
    if (!session) {
      throw new UnauthorizedException('Session not found');
    }

    // 🔒 التحقق من تطابق userId
    if (session.userId !== payload.sub) {
      throw new UnauthorizedException('Session does not belong to user');
    }

    // 🔒 التحقق من عدم إبطال الجلسة
    if (session.isRevoked) {
      throw new UnauthorizedException(
        'Session has been revoked. Please login again.',
      );
    }

    const nowDate = new Date();

    // 🔒 التحقق من انتهاء صلاحية الجلسة (JWT expiry handled by Passport)
    const sessionExpired = session.expiresAt && session.expiresAt < nowDate;
    if (sessionExpired) {
      throw new UnauthorizedException(
        'Session has expired. Please login again.',
      );
    }

    // 🔒 التحقق من Idle Timeout (8 ساعات من عدم النشاط - تقليل من 24 ساعة لتقليل نافذة الهجوم)
    const IDLE_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 ساعات
    const lastActivity = session.lastActivity || session.createdAt;
    const timeSinceLastActivity = nowDate.getTime() - lastActivity.getTime();

    if (timeSinceLastActivity > IDLE_TIMEOUT_MS) {
      throw new UnauthorizedException(
        'Session has been inactive for too long. Please login again.',
      );
    }

    // 🔒 Session fingerprint verification — detect stolen sessions
    // Must match the headers used at login time (auth.service.ts) — only user-agent
    const currentFingerprint = this.sessionFingerprintService.generateSimpleFingerprint({
      'user-agent': req.headers?.['user-agent'],
    });
    const fpResult = await this.sessionFingerprintService.verifySessionFingerprint(
      session.id,
      currentFingerprint,
    );
    if (fpResult.mismatch && !fpResult.valid) {
      const isLocalhostRequest = [
        req.headers?.origin,
        req.headers?.referer,
        req.headers?.host,
        req.headers?.['x-forwarded-host'],
        process.env.FRONTEND_URL,
        process.env.FRONTEND_URL_ALT,
        process.env.AUTH_FRONTEND_URL,
      ].some((value) => isLocalhostContext(value));

      if (isLocalhostRequest) {
        await this.sessionFingerprintService.bindFingerprintToSession(
          session.id,
          currentFingerprint,
          session.userId,
        );
      } else {
        throw new UnauthorizedException(
          'Session fingerprint mismatch. Please login again.',
        );
      }
    }

    // ⚡ Performance: In-memory throttle to prevent concurrent DB updates
    // This eliminates 770ms+ slow queries caused by concurrent writes
    const lastUpdate = lastActivityUpdateCache.get(session.id) || 0;
    const timeSinceLastUpdate = nowDate.getTime() - lastUpdate;

    if (
      timeSinceLastActivity > ACTIVITY_UPDATE_INTERVAL_MS &&
      timeSinceLastUpdate > ACTIVITY_UPDATE_INTERVAL_MS
    ) {
      // Set cache FIRST to prevent concurrent updates
      lastActivityUpdateCache.set(session.id, nowDate.getTime());

      // 🔒 حساب expiresAt جديد (30 دقيقة من الآن) لتمديد الجلسة
      const newExpiresAt = new Date(nowDate.getTime() + 30 * 60 * 1000);

      this.prisma.$executeRaw`
        UPDATE sessions 
        SET "lastActivity" = NOW(), "expiresAt" = ${newExpiresAt}
        WHERE id = ${session.id}
      `.catch(() => {
        // تجاهل الأخطاء - لا نريد أن يفشل الطلب بسبب تحديث النشاط
        // On error, remove from cache so next request can retry
        lastActivityUpdateCache.delete(session.id);
      });
    }

    // Return flattened user object
    const sub = session.user.subscription;
    const subscriptionPlan =
      sub?.status === 'ACTIVE' &&
      (!sub.currentPeriodEnd || sub.currentPeriodEnd > new Date())
        ? sub.plan
        : 'FREE';

    const result = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      name: session.user.profile?.name,
      username: session.user.profile?.username,
      avatar: session.user.profile?.avatar,
      bio: session.user.profile?.bio,
      phone: session.user.phone,
      bannerUrls: session.user.bannerUrls || [],
      profileCompleted: session.user.profileCompleted ?? false,
      sessionId: session.id, // 🔒 Session ID للاستخدام لاحقاً
      subscriptionPlan,
    };
    return result;
  }
}

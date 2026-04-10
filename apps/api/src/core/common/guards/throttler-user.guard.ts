import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * 🔒 User-based Throttler Guard
 *
 * يقوم بـ Rate Limiting بناءً على user ID للـ authenticated users
 * وباستخدام IP address للـ anonymous users
 *
 * الاستخدام:
 * ```typescript
 * // استبدال ThrottlerGuard بـ ThrottlerUserGuard في app.module.ts
 * {
 *   provide: APP_GUARD,
 *   useClass: ThrottlerUserGuard,
 * }
 * ```
 */
@Injectable()
export class ThrottlerUserGuard extends ThrottlerGuard {
  /**
   * تخطي Rate Limiting للطلبات الداخلية من Docker (SSR من Next.js)
   */
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip = this.getClientIp(req);
    const userAgent = req.headers?.['user-agent'] || '';

    // Skip throttling for internal requests (Next.js SSR on localhost)
    if ((ip.startsWith('172.') || ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1') && userAgent === 'node') {
      return true;
    }

    return false;
  }

  /**
   * 🔒 توليد مفتاح فريد للـ rate limiting
   * - للـ authenticated users: user ID
   * - للـ anonymous users: IP address
   */
  protected async getTracker(req: Record<string, any>): Promise<string> {
    // إذا كان المستخدم مسجلاً، استخدم user ID
    const user = (req as any).user;
    if (user?.id) {
      return `user:${user.id}`;
    }

    // إذا لم يكن مسجلاً، استخدم IP address الحقيقي خلف reverse proxy
    const ip = this.getClientIp(req);
    return `ip:${ip}`;
  }

  private getClientIp(req: Record<string, any>): string {
    const forwarded = req.headers?.['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      const firstIp = forwarded.split(',')[0]?.trim();
      if (firstIp) {
        return firstIp;
      }
    }

    const realIp = req.headers?.['x-real-ip'];
    if (typeof realIp === 'string' && realIp.length > 0) {
      return realIp;
    }

    return req.ip || req.socket?.remoteAddress || 'unknown';
  }
}

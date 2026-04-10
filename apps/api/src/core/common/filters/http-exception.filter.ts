import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * 🔒 Global Exception Filter
 *
 * يحمي من تسريب معلومات حساسة في Production
 * - يخفي تفاصيل الأخطاء في Production
 * - يسجل جميع الأخطاء للتحليل
 * - يعرض رسائل آمنة للمستخدمين
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  private readonly isProduction = process.env.NODE_ENV === 'production';

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // الحصول على رسالة الخطأ
    const exceptionResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'خطأ داخلي في الخادم' };

    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || 'حدث خطأ';

    // 🔒 في Production، إرجاع رسائل عامة فقط
    const safeMessage = this.isProduction
      ? this.getSafeMessage(status, message)
      : message;

    // بناء response آمن
    const requestId = (request as any).requestId || request.headers['x-request-id'];
    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: Array.isArray(safeMessage) ? safeMessage : [safeMessage],
      // 🔒 Request ID للتتبع والدعم الفني
      requestId,
      // 🔒 في Development فقط، إضافة تفاصيل إضافية
      ...(!this.isProduction && {
        error:
          exception instanceof Error ? exception.message : String(exception),
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // تسجيل الخطأ
    // 🔕 401/403 on auth routes are expected for unauthenticated users - skip logging entirely
    const forwardedFor = request.headers['x-forwarded-for'];
    const firstForwardedIp =
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0]?.trim()
        : undefined;

    const logPayload = {
      statusCode: status,
      path: request.url,
      method: request.method,
      message: Array.isArray(message) ? message.join(', ') : message,
      error: exception instanceof Error ? exception.message : String(exception),
      stack:
        status === HttpStatus.TOO_MANY_REQUESTS
          ? undefined
          : exception instanceof Error
            ? exception.stack
            : undefined,
      user: (request as any).user?.id,
      ip:
        firstForwardedIp ||
        request.ip ||
        request.headers['x-real-ip'] ||
        request.socket.remoteAddress,
      userAgent: request.get('User-Agent'),
    };

    // Skip logging entirely for expected auth failures on auth endpoints
    const isAuthEndpoint = request.url.includes('/auth/');
    const isExpectedAuthFailure =
      (status === HttpStatus.UNAUTHORIZED || status === HttpStatus.FORBIDDEN) &&
      isAuthEndpoint;
    const isExpectedAuthRateLimit =
      status === HttpStatus.TOO_MANY_REQUESTS && isAuthEndpoint;

    if (isExpectedAuthFailure) {
      // Silently skip - these are expected for unauthenticated users
    } else if (isExpectedAuthRateLimit) {
      // Auth throttling is expected under burst traffic; keep logs lightweight
      this.logger.debug(logPayload);
    } else if (
      status === HttpStatus.UNAUTHORIZED ||
      status === HttpStatus.FORBIDDEN
    ) {
      // Non-auth endpoint auth failures might be interesting
      this.logger.debug(logPayload);
    } else {
      this.logger.error(logPayload);
    }

    response.status(status).json(errorResponse);
  }

  /**
   * 🔒 إرجاع رسائل آمنة في Production
   */
  private getSafeMessage(
    status: number,
    originalMessage: string | string[],
  ): string | string[] {
    // رسائل التحقق من الصحة يمكن عرضها
    if (
      status === HttpStatus.BAD_REQUEST ||
      status === HttpStatus.UNPROCESSABLE_ENTITY
    ) {
      return originalMessage;
    }

    // رسائل عامة للأنواع الأخرى من الأخطاء
    const safeMessages: Record<number, string> = {
      [HttpStatus.UNAUTHORIZED]: 'مطلوب تسجيل الدخول',
      [HttpStatus.FORBIDDEN]: 'تم رفض الوصول',
      [HttpStatus.NOT_FOUND]: 'المورد غير موجود',
      [HttpStatus.METHOD_NOT_ALLOWED]: 'الطريقة غير مسموح بها',
      [HttpStatus.CONFLICT]: 'حدث تعارض',
      [HttpStatus.TOO_MANY_REQUESTS]:
        'عدد الطلبات كبير جدًا، يرجى المحاولة لاحقًا',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'خطأ داخلي في الخادم',
      [HttpStatus.BAD_GATEWAY]: 'بوابة غير صالحة',
      [HttpStatus.SERVICE_UNAVAILABLE]: 'الخدمة غير متاحة',
    };

    return safeMessages[status] || 'حدث خطأ';
  }
}

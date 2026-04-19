import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiKeysService } from '../api-keys.service';

/**
 * 🔐 API Key Authentication Guard
 *
 * يتحقق من صحة API Key المرسل في Header:
 *   X-API-Key: rk_live_xxxxxxxxxxxx
 *
 * يُستخدم على Public API endpoints (v1/whatsapp/*)
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyAuthGuard.name);

  constructor(
    private apiKeysService: ApiKeysService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // استخراج API Key من Header
    const apiKey =
      request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '');

    if (!apiKey) {
      throw new UnauthorizedException('API key is required. Use X-API-Key header.');
    }

    // التحقق من صيغة المفتاح
    if (!apiKey.startsWith('rk_live_') && !apiKey.startsWith('rk_test_')) {
      throw new UnauthorizedException('Invalid API key format.');
    }

    // التحقق من صحة المفتاح
    const keyData = await this.apiKeysService.validateKey(apiKey);

    if (!keyData) {
      throw new UnauthorizedException('Invalid or expired API key.');
    }

    // التحقق من IP allowlist
    if (keyData.ipAllowlist.length > 0) {
      const clientIp = request.ip || request.connection?.remoteAddress;
      if (!keyData.ipAllowlist.includes(clientIp)) {
        this.logger.warn(
          `IP ${clientIp} not in allowlist for API key ${keyData.id}`,
        );
        throw new ForbiddenException('IP address not allowed for this API key.');
      }
    }

    // التحقق من Scopes (إن تم تحديد scopes مطلوبة على الـ endpoint)
    const requiredScopes = this.reflector.get<string[]>(
      'api-scopes',
      context.getHandler(),
    );

    if (requiredScopes && requiredScopes.length > 0) {
      const hasScope = requiredScopes.every((scope) =>
        keyData.scopes.includes(scope),
      );
      if (!hasScope) {
        throw new ForbiddenException(
          `Insufficient permissions. Required scopes: ${requiredScopes.join(', ')}`,
        );
      }
    }

    // إضافة بيانات المفتاح إلى الطلب
    request.apiKey = keyData;
    request.apiKeyId = keyData.id;
    request.userId = keyData.userId;

    return true;
  }
}

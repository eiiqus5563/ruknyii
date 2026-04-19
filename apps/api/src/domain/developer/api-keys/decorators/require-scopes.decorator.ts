import { SetMetadata } from '@nestjs/common';

/**
 * 🔒 Decorator لتحديد Scopes المطلوبة على endpoint
 *
 * @example
 * @RequireScopes('whatsapp:send')
 * @RequireScopes('templates:read', 'templates:write')
 */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata('api-scopes', scopes);

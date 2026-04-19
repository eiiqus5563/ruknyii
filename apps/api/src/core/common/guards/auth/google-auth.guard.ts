import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class GoogleAuthGuard extends AuthGuard('google') {
  getAuthenticateOptions(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const redirectOrigin = req.query?.redirect_origin;
    if (redirectOrigin) {
      return { state: redirectOrigin };
    }
    return {};
  }
}

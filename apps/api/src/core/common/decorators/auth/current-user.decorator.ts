import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * Shape of the user object attached to the request by JwtStrategy.validate().
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
  name?: string;
  username?: string;
  avatar?: string;
  bio?: string;
  phone?: string;
  bannerUrls: string[];
  profileCompleted: boolean;
  sessionId: string;
  subscriptionPlan?: string;
}

export const CurrentUser = createParamDecorator(
  (data: keyof AuthenticatedUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    return data ? user?.[data] : user;
  },
);

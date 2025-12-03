import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from '../strategies/jwt.strategy';

/**
 * Extract the current authenticated user from the request
 */
export const CurrentUser = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: TenantContext = request.user;

    if (!user) {
      return null;
    }

    return data ? user[data] : user;
  },
);

/**
 * Extract tenant context from the request
 */
export const TenantCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): TenantContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

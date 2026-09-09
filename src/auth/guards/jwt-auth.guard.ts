import { Injectable, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { AppException } from '../../common/errors/app.exception';
import { IS_PUBLIC_KEY } from '../auth.constants';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    if (!this.isPublic(context)) {
      return (await super.canActivate(context)) as boolean;
    }

    try {
      await super.canActivate(context);
    } catch {}

    return true;
  }

  handleRequest<TUser>(
    error: unknown,
    user: TUser,
    _info: unknown,
    context: ExecutionContext,
  ) {
    if (error || !user) {
      if (this.isPublic(context)) return null as TUser;
      throw AppException.unauthorized('Sign in to continue');
    }

    return user;
  }

  private isPublic(context: ExecutionContext) {
    return this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
  }
}

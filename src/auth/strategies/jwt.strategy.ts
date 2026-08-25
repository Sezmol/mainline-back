import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import type { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AppException } from '../../common/errors/app.exception';
import type { Env } from '../../config/env';
import { UsersService } from '../../users/users.service';
import { ACCESS_COOKIE } from '../auth.constants';
import type { AccessTokenPayload } from '../tokens/token.service';

const fromAccessCookie = (request: Request) => {
  const cookies = request.cookies as Record<string, string> | undefined;
  return cookies?.[ACCESS_COOKIE] ?? null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService<Env, true>,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([fromAccessCookie]),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_ACCESS_SECRET', { infer: true }),
    });
  }

  async validate(payload: AccessTokenPayload) {
    const user = await this.users.findById(payload.sub);

    if (!user) {
      throw AppException.unauthorized('This session is no longer valid');
    }

    return user;
  }
}

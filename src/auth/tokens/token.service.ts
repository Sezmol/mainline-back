import { createHmac, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Env } from '../../config/env';
import type { User } from '../../users/users.types';

export interface AccessTokenPayload {
  sub: string;
  nickname: string;
  role: string;
}

export interface IssuedRefreshToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

const DURATION_PATTERN = /^(\d+)([smhd])$/;
const UNIT_MS = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

export const durationToMs = (value: string) => {
  const match = DURATION_PATTERN.exec(value);
  if (!match) {
    throw new Error(
      `Invalid duration "${value}". Use a number followed by s, m, h or d.`,
    );
  }

  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit as keyof typeof UNIT_MS];
};

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  get accessTokenMaxAge() {
    return durationToMs(this.config.get('JWT_ACCESS_TTL', { infer: true }));
  }

  get refreshTokenMaxAge() {
    return durationToMs(this.config.get('JWT_REFRESH_TTL', { infer: true }));
  }

  signAccessToken(user: User) {
    const payload: AccessTokenPayload = {
      sub: user.id,
      nickname: user.nickname,
      role: user.role,
    };

    return this.jwt.signAsync(payload, {
      secret: this.config.get('JWT_ACCESS_SECRET', { infer: true }),
      expiresIn: this.config.get('JWT_ACCESS_TTL', { infer: true }),
    });
  }

  issueRefreshToken(): IssuedRefreshToken {
    const token = randomBytes(48).toString('base64url');

    return {
      token,
      tokenHash: this.hashRefreshToken(token),
      expiresAt: new Date(Date.now() + this.refreshTokenMaxAge),
    };
  }

  hashRefreshToken(token: string) {
    return createHmac(
      'sha256',
      this.config.get('JWT_REFRESH_SECRET', { infer: true }),
    )
      .update(token)
      .digest('hex');
  }
}

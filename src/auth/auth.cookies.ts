import type { CookieOptions, Response } from 'express';
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  REFRESH_COOKIE_PATH,
} from './auth.constants';

export interface AuthCookieConfig {
  secure: boolean;
  accessMaxAge: number;
  refreshMaxAge: number;
}

const baseOptions = (secure: boolean): CookieOptions => ({
  httpOnly: true,
  sameSite: 'lax',
  secure,
});

export const setAuthCookies = (
  response: Response,
  tokens: { accessToken: string; refreshToken: string },
  config: AuthCookieConfig,
) => {
  response.cookie(ACCESS_COOKIE, tokens.accessToken, {
    ...baseOptions(config.secure),
    path: '/',
    maxAge: config.accessMaxAge,
  });

  response.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...baseOptions(config.secure),
    path: REFRESH_COOKIE_PATH,
    maxAge: config.refreshMaxAge,
  });
};

export const clearAuthCookies = (
  response: Response,
  config: Pick<AuthCookieConfig, 'secure'>,
) => {
  response.clearCookie(ACCESS_COOKIE, {
    ...baseOptions(config.secure),
    path: '/',
  });
  response.clearCookie(REFRESH_COOKIE, {
    ...baseOptions(config.secure),
    path: REFRESH_COOKIE_PATH,
  });
};

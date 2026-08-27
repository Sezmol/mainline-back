import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { ZodResponse } from 'nestjs-zod';
import type { Env } from '../config/env';
import { SessionUserDto, toSessionUser } from '../users/dto/user.dto';
import type { User } from '../users/users.types';
import { REFRESH_COOKIE } from './auth.constants';
import { clearAuthCookies, setAuthCookies } from './auth.cookies';
import { AuthService, type AuthResult } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { TokenService } from './tokens/token.service';

const AUTH_THROTTLE = { default: { limit: 10, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService<Env, true>,
  ) {}

  @Public()
  @Post('register')
  @HttpCode(201)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Create an account and start a session' })
  @ZodResponse({ status: 201, type: SessionUserDto })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.completeSession(await this.auth.register(dto), response);
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle(AUTH_THROTTLE)
  @ApiOperation({ summary: 'Start a session' })
  @ZodResponse({ status: 200, type: SessionUserDto })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.completeSession(await this.auth.login(dto), response);
  }

  @Public()
  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Rotate the refresh token and issue a new access token',
  })
  @ZodResponse({ status: 200, type: SessionUserDto })
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, string> | undefined;
    const result = await this.auth.refresh(cookies?.[REFRESH_COOKIE]);
    return this.completeSession(result, response);
  }

  @Public()
  @Post('logout')
  @HttpCode(204)
  @ApiOperation({ summary: 'End the session and clear both cookies' })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const cookies = request.cookies as Record<string, string> | undefined;
    await this.auth.logout(cookies?.[REFRESH_COOKIE]);
    clearAuthCookies(response, { secure: this.isSecure });
  }

  @Get()
  @ApiCookieAuth('access_token')
  @ApiOperation({ summary: 'The signed-in user' })
  @ZodResponse({ status: 200, type: SessionUserDto })
  session(@CurrentUser() user: User) {
    return toSessionUser(user);
  }

  private get isSecure() {
    return this.config.get('NODE_ENV', { infer: true }) === 'production';
  }

  private completeSession(result: AuthResult, response: Response) {
    setAuthCookies(
      response,
      { accessToken: result.accessToken, refreshToken: result.refreshToken },
      {
        secure: this.isSecure,
        accessMaxAge: this.tokens.accessTokenMaxAge,
        refreshMaxAge: this.tokens.refreshTokenMaxAge,
      },
    );

    return toSessionUser(result.user);
  }
}

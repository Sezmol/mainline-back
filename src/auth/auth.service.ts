import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { DataSource, type EntityManager } from 'typeorm';
import { roleForSpeciality } from '../common/domain/directory';
import { ChatsService } from '../chats/chats.service';
import { AppException } from '../common/errors/app.exception';
import { UsersService } from '../users/users.service';
import type { User } from '../users/users.types';
import type { LoginDto } from './dto/login.dto';
import type { RegisterDto } from './dto/register.dto';
import { RefreshTokenRepository } from './tokens/refresh-token.repository';
import { TokenService } from './tokens/token.service';

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

const ARGON2_OPTIONS: argon2.HashOptions = { type: argon2.argon2id };

@Injectable()
export class AuthService {
  private readonly decoyHash = argon2.hash(
    randomBytes(32).toString('hex'),
    ARGON2_OPTIONS,
  );

  constructor(
    private readonly users: UsersService,
    private readonly chats: ChatsService,
    private readonly tokens: TokenService,
    private readonly refreshTokens: RefreshTokenRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);

    return this.dataSource.transaction(async (manager) => {
      const user = await this.users.create(
        {
          firstName: dto.firstName,
          lastName: dto.lastName,
          nickname: dto.nickname,
          email: dto.email,
          passwordHash,
          speciality: dto.speciality,
          role: roleForSpeciality(dto.speciality),
        },
        manager,
      );

      await this.chats.ensureFavorites(user.id, manager);

      return this.issueSession(user, manager);
    });
  }

  async login(dto: LoginDto) {
    const found = await this.users.findWithPasswordByNickname(dto.nickname);

    if (!found) {
      await argon2
        .verify(await this.decoyHash, dto.password)
        .catch(() => false);
      throw this.invalidCredentials();
    }

    const matches = await argon2
      .verify(found.passwordHash, dto.password)
      .catch(() => false);

    if (!matches) {
      throw this.invalidCredentials();
    }

    return this.dataSource.transaction((manager) =>
      this.issueSession(found.user, manager),
    );
  }

  async refresh(rawToken: string | undefined) {
    if (!rawToken) {
      throw AppException.unauthorized('No refresh token was sent');
    }

    const tokenHash = this.tokens.hashRefreshToken(rawToken);

    return this.dataSource.transaction(async (manager) => {
      const record = await this.refreshTokens.findByHash(tokenHash, manager);

      if (!record || record.expiresAt.getTime() <= Date.now()) {
        throw AppException.unauthorized('Session expired. Sign in again.');
      }

      const user = await this.users.findById(record.userId);

      if (!user) {
        throw AppException.unauthorized('This session is no longer valid');
      }

      await this.refreshTokens.deleteByHash(tokenHash, manager);
      return this.issueSession(user, manager);
    });
  }

  async logout(rawToken: string | undefined) {
    if (!rawToken) return;
    await this.refreshTokens.deleteByHash(
      this.tokens.hashRefreshToken(rawToken),
    );
  }

  private async issueSession(user: User, manager?: EntityManager) {
    const accessToken = await this.tokens.signAccessToken(user);
    const refresh = this.tokens.issueRefreshToken();

    await this.refreshTokens.deleteExpiredForUser(user.id, manager);

    await this.refreshTokens.create(
      {
        userId: user.id,
        tokenHash: refresh.tokenHash,
        expiresAt: refresh.expiresAt,
      },
      manager,
    );

    return { user, accessToken, refreshToken: refresh.token };
  }

  private invalidCredentials() {
    return AppException.unauthorized('Wrong nickname or password');
  }
}

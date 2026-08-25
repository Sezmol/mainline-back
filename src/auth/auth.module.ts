import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RefreshTokenEntity } from './tokens/infra/postgres/refresh-token.entity';
import { RefreshTokenTypeormRepository } from './tokens/infra/postgres/refresh-token.typeorm.repository';
import { RefreshTokenRepository } from './tokens/refresh-token.repository';
import { TokenService } from './tokens/token.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.register({}),
    TypeOrmModule.forFeature([RefreshTokenEntity]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    JwtStrategy,
    {
      provide: RefreshTokenRepository,
      useClass: RefreshTokenTypeormRepository,
    },
  ],
})
export class AuthModule {}

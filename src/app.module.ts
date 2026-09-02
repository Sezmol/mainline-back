import { randomUUID } from 'node:crypto';
import { Module, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { LoggerModule } from 'nestjs-pino';
import { ZodSerializerInterceptor } from 'nestjs-zod';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { validateEnv, type Env } from './config/env';
import { HealthModule } from './health/health.module';
import { InteractionsModule } from './interactions/interactions.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PortfolioModule } from './portfolio/portfolio.module';
import { PostsModule } from './posts/posts.module';
import { DatabaseModule } from './infra/database/database.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnv,
    }),

    LoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Env, true>) => {
        const isDev = config.get('NODE_ENV', { infer: true }) === 'development';
        const prefix = config.get('API_PREFIX', { infer: true });

        return {
          forRoutes: [{ path: '{*path}', method: RequestMethod.ALL }],
          pinoHttp: {
            level: config.get('LOG_LEVEL', { infer: true }),
            genReqId: (req: IncomingMessage, res: ServerResponse) => {
              const header = req.headers['x-request-id'];
              const id =
                (Array.isArray(header) ? header[0] : header) ?? randomUUID();
              res.setHeader('x-request-id', id);
              return id;
            },
            redact: [
              'req.headers.cookie',
              'req.headers.authorization',
              'res.headers["set-cookie"]',
            ],
            autoLogging: {
              ignore: (req: IncomingMessage) => req.url === `/${prefix}/health`,
            },
            ...(isDev
              ? {
                  transport: {
                    target: 'pino-pretty',
                    options: { singleLine: true, translateTime: 'HH:MM:ss' },
                  },
                }
              : {}),
          },
        };
      },
    }),

    ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 120 }]),

    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    PostsModule,
    PortfolioModule,
    InteractionsModule,
    NotificationsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor },
  ],
})
export class AppModule {}

import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import { ZodValidationPipe, cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/errors/all-exceptions.filter';
import { ErrorResponse } from './common/errors/error-response';
import { attachErrorResponses } from './common/errors/openapi-errors';
import type { Env } from './config/env';

const bootstrap = async () => {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(Logger));

  const config: ConfigService<Env, true> = app.get(ConfigService);
  const prefix = config.get('API_PREFIX', { infer: true });
  const port = config.get('PORT', { infer: true });

  app.setGlobalPrefix(prefix);
  app.use(helmet());
  app.use(cookieParser());
  app.enableCors({
    origin: config
      .get('CORS_ORIGIN', { infer: true })
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });

  app.useGlobalPipes(new ZodValidationPipe());
  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('mainline API')
      .setDescription('Professional network for engineers')
      .setVersion('0.1.0')
      .addCookieAuth('access_token', { type: 'apiKey', in: 'cookie' })
      .build(),
    { extraModels: [ErrorResponse] },
  );

  const documented = attachErrorResponses(cleanupOpenApiDoc(document));

  SwaggerModule.setup(`${prefix}/docs`, app, documented, {
    jsonDocumentUrl: `${prefix}/openapi.json`,
  });

  await app.listen(port);
};

void bootstrap();

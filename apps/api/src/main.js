import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import RedisStore from 'connect-redis';
import express from 'express';
import { loadConfig } from '@humble/config';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { RedisService } from './common/redis/redis.service';

async function bootstrap() {
  const config = loadConfig();
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(helmet());
  app.enableCors({ origin: config.CORS_ORIGIN, credentials: true });
  app.use(cookieParser());

  // Raw body for the dev-only local upload endpoint must be registered before
  // any JSON body-parsing occurs for that path (docs/06-lld.md §2 upload flow).
  app.use('/v1/uploads', express.raw({ type: '*/*', limit: '10mb' }));

  const redisService = app.get(RedisService);
  app.use(
    session({
      store: new RedisStore({ client: redisService.getClient(), prefix: 'humble:sess:' }),
      secret: config.SESSION_SECRET,
      name: 'humble_sid',
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: config.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 30 * 24 * 60 * 60 * 1000,
      },
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  await app.listen(config.API_PORT);
  console.log(`Humble API listening on port ${config.API_PORT}`);
}

bootstrap();

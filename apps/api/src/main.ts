import 'dotenv/config';
import { initSentry } from './common/sentry';
initSentry(); // must be first before any other imports that could throw
import { NestFactory } from '@nestjs/core';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { json, urlencoded } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { AppModule } from './app.module';
import { env } from './common/env';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));

  app.use(helmet());

  const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      if (!origin) return callback(null, true);
      const allowed =
        allowedOrigins.some((o) => o === origin || o === '*') ||
        /^https:\/\/[a-z0-9-]+(\.vercel\.app)$/.test(origin);
      callback(allowed ? null : new Error('CORS'), allowed);
    },
    credentials: true,
  });

  // Raw-body capture for the webhook route signature verification.
  // Must run BEFORE the JSON parser so rawBody is set on the request.
  app.use(
    '/webhooks/whatsapp',
    (req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        req.rawBody = Buffer.concat(chunks);
        next();
      });
    },
  );

  app.use(json());
  app.use(urlencoded({ extended: true }));

  await app.listen(env.PORT);
}

bootstrap();

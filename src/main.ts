import { Logger, ValidationPipe } from '@nestjs/common';

import { NestFactory } from '@nestjs/core';

import * as express from 'express';

import { join } from 'path';

import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  try {
    const app = await NestFactory.create(AppModule);

    // Global Prefix
    app.setGlobalPrefix('api');

    // Static Images Folder
    app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

    // Enable CORS
    app.enableCors({
      origin: 'http://localhost:3000',
      methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
      credentials: true, // Allow cookies and auth headers to pass through
    });
    // Global Validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    const port = process.env.PORT || 8080;

    await app.listen(port);

    logger.log(`Server running on http://localhost:${port}/api`);
  } catch (error) {
    logger.error('Application failed to start', error);
  }
}

void bootstrap();

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
    app.use('/uploads', express.static(join(__dirname, '..', 'uploads')));

    // Enable CORS
    app.enableCors();

    // Global Validation
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
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

import * as dotenv from 'dotenv';

dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';

import { ProductSeeder } from './product.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const productSeeder = app.get(ProductSeeder);

    await productSeeder.seed();
  } catch (error) {
    console.error(error);
  } finally {
    await app.close();
  }
}

void bootstrap();

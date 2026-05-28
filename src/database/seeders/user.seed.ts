import * as dotenv from 'dotenv';

dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';

import { UserSeeder } from './user.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const userSeeder = app.get(UserSeeder);

    await userSeeder.seed();
  } catch (error) {
    console.error(error);
  } finally {
    await app.close();
  }
}

void bootstrap();

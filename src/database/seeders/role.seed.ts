import * as dotenv from 'dotenv';

dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';

import { RoleSeeder } from './role.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const roleSeeder = app.get(RoleSeeder);

    await roleSeeder.seed();

    console.log('Role seeding completed');
  } catch (error) {
    console.error(error);
  } finally {
    await app.close();
  }
}

void bootstrap();

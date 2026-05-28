import * as dotenv from 'dotenv';

dotenv.config({
  path: `.env.${process.env.NODE_ENV || 'development'}`,
});

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';

import { RoleSeeder } from './role.seeder';
import { UserSeeder } from './user.seeder';
import { ProductSeeder } from './product.seeder';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  try {
    const roleSeeder = app.get(RoleSeeder);
    const userSeeder = app.get(UserSeeder);
    const productSeeder = app.get(ProductSeeder);

    await roleSeeder.seed();
    await userSeeder.seed();
    await productSeeder.seed();

    console.log('All seeding completed (roles, users, products)');
  } catch (error) {
    console.error(error);
  } finally {
    await app.close();
  }
}

void bootstrap();

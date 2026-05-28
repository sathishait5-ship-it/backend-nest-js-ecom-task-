import { Logger, MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule'; // 1. IMPORT THIS HERE

import { AppController } from './app.controller';
import { AppService } from './app.service';

// FEATURE MODULES
import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { AuthModule } from './auth/auth.module';
import { ProductsModule } from './products/products.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SeederModule } from './database/seeders/seed.module';
import { CronsModule } from './crons/crons.module';

// MIDDLEWARE
import { CorsMiddleware } from './common/middleware/cors.middleware';

const logger = new Logger('MongoDB');

@Module({
  imports: [
    ScheduleModule.forRoot(), // 2. INITIALIZE IT HERE AT THE VERY TOP

    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${process.env.NODE_ENV}`,
    }),

    // GLOBAL RATE LIMIT
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 20, // 20 requests per minute
      },
    ]),

    MongooseModule.forRootAsync({
      useFactory: () => {
        logger.log('Connecting to MongoDB...');

        return {
          uri: process.env.MONGO_URI,

          onConnectionCreate: (connection: Connection) => {
            logger.log('MongoDB connected successfully');

            connection.on('connected', () => {
              logger.log('MongoDB connection established');
            });

            connection.on('disconnected', () => {
              logger.warn('MongoDB disconnected');
            });

            connection.on('reconnected', () => {
              logger.log('MongoDB reconnected');
            });

            connection.on('error', (error) => {
              logger.error('MongoDB connection error', error);
            });

            return connection;
          },
        };
      },
    }),

    // FEATURE MODULES
    UsersModule,
    RolesModule,
    AuthModule,
    ProductsModule,
    ReviewsModule,
    SeederModule,
    CronsModule,
  ],

  controllers: [AppController],

  providers: [
    AppService,

    // GLOBAL THROTTLER GUARD
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorsMiddleware).forRoutes('*');
  }
}

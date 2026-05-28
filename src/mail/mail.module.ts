import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { join } from 'path';

import { MailService } from './mail.service';
import { MailController } from './mail.controller';
import { MailProcessor } from './mail.processor';

@Module({
  imports: [
    ConfigModule,

    // Register Bull Queue
    BullModule.registerQueue({
      name: 'mail_queue',
    }),

    // Mailer Configuration
    MailerModule.forRootAsync({
      imports: [ConfigModule],

      inject: [ConfigService],

      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get<string>('MAIL_HOST'),
          port: Number(configService.get<string>('MAIL_PORT')),
          secure: false,

          auth: {
            user: configService.get<string>('MAIL_USER'),
            pass: configService.get<string>('MAIL_PASS'),
          },

          tls: {
            rejectUnauthorized: false,
          },
        } as SMTPTransport.Options,

        defaults: {
          from: configService.get<string>('MAIL_FROM'),
        },

        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],

  controllers: [MailController],

  providers: [MailService, MailProcessor],

  exports: [MailService],
})
export class MailModule {}

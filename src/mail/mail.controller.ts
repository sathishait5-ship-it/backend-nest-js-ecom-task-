import { Controller, Get, Query } from '@nestjs/common';
import { MailService } from './mail.service';

@Controller('mail')
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Get('welcome')
  sendWelcome(@Query('email') email: string, @Query('name') name: string) {
    return this.mailService.sendWelcomeMail(email, name);
  }
}

import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { MailerService } from '@nestjs-modules/mailer';
import { Logger } from '@nestjs/common';

// Define explicit interfaces for your job payloads
interface WelcomeJobData {
  to: string;
  name: string;
}

interface ProductAddedJobData {
  recipients: string[];
  templateContext: {
    name: string;
    description: string;
    price: number;
    discountPrice?: number;
    stock: number;
    category: string;
    brand: string;
    images: string[];
    creatorId?: string;
  };
}

@Processor('mail_queue')
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailerService: MailerService) {}

  @Process('welcome_job')
  // Pass the WelcomeJobData interface into the Job generic
  async handleWelcomeMail(job: Job<WelcomeJobData>) {
    const { to, name } = job.data;
    this.logger.log(`Processing background welcome email for: ${to}`);

    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Welcome to Our Platform!',
        template: 'welcome',
        context: { name },
      });
      this.logger.log(`Welcome email successfully sent to: ${to}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed sending welcome email to ${to}`, err.stack);
      throw error;
    }
  }

  @Process('product_added_job')
  // Pass the ProductAddedJobData interface into the Job generic
  async handleProductAddedMail(job: Job<ProductAddedJobData>) {
    const { recipients, templateContext } = job.data;
    this.logger.log(`Processing background product notification broadcast...`);

    try {
      await this.mailerService.sendMail({
        to: recipients,
        subject: `🚨 Alert: New Product Added - ${templateContext.name}`,
        template: 'product-added',
        context: templateContext,
        attachments: [
          {
            filename: 'sample-document.pdf',
            path: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          },
          {
            filename: 'test-remote-image.png',
            path: 'https://picsum.photos/200/300',
          },
        ],
      });
      this.logger.log(`Product notification emails successfully broadcasted.`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(
        `Failed broadcasting product notification emails`,
        err.stack,
      );
      throw error;
    }
  }
}

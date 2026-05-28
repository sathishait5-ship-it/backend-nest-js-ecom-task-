import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class MailService {
  constructor(@InjectQueue('mail_queue') private readonly mailQueue: Queue) {}

  /**
   * Send Welcome Email to Newly Registered Users (via Background Queue)
   */
  async sendWelcomeMail(to: string, name: string) {
    await this.mailQueue.add(
      'welcome_job',
      { to, name },
      {
        attempts: 3,
        backoff: 5000,
        removeOnComplete: true,
      },
    );

    return {
      message: 'Welcome mail enqueued successfully',
    };
  }

  /**
   * Broadcast Operational Alerts for New Product Intake
   */
  async sendProductAddedMail(
    recipients: string[],
    productData: ProductDocument,
  ) {
    const baseUrl = 'http://localhost:8080';

    const formattedImages = productData.images.map((path) => {
      const cleanPath = path.replace(/\\/g, '/');
      return `${baseUrl}/${cleanPath}`;
    });

    console.log('Fixed formattedImages for Email:', formattedImages);

    const templateContext = {
      name: productData.name,
      description: productData.description,
      price: productData.price,
      discountPrice: productData.discountPrice,
      stock: productData.stock,
      category: productData.category,
      brand: productData.brand,
      images: formattedImages,
      creatorId: productData.createdBy?.toString(),
    };

    await this.mailQueue.add(
      'product_added_job',
      {
        recipients,
        templateContext,
      },
      {
        attempts: 3,
        backoff: 10000,
        removeOnComplete: true,
      },
    );

    return { message: 'Product notification emails enqueued successfully.' };
  }
}

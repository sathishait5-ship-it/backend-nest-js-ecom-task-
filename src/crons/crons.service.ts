import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import { Product, ProductDocument } from '../products/schemas/product.schema';

@Injectable()
export class CronsService implements OnModuleInit {
  private readonly logger = new Logger(CronsService.name);
  private readonly backupDir = path.join(__dirname, '..', '..', 'backups');

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,
  ) {}

  /**
   * Runs automatically when the module starts up to ensure the backup folder exists
   */
  onModuleInit() {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
      this.logger.log(`Backup directory created at: ${this.backupDir}`);
    }
  }

  /**
   * CRON Task: Runs every 1 minute to download and save products from MongoDB
   */
  @Cron(CronExpression.EVERY_YEAR)
  async downloadProductsBackup() {
    this.logger.log(
      'CRON Triggered: Starting scheduled product database download...',
    );

    try {
      // 1. Fetch all products from the collection
      const products = await this.productModel.find().lean();

      if (!products || products.length === 0) {
        this.logger.warn(
          'CRON Completed: No products found in the database to download.',
        );
        return;
      }

      // 2. Generate a dynamic timestamped filename (e.g., products_2026-05-28_13-45-00.json)
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `products_backup_${timestamp}.json`;
      const fullPath = path.join(this.backupDir, filename);

      // 3. Convert the product documents array into a formatted JSON string
      const jsonContent = JSON.stringify(products, null, 2);

      // 4. Write the file synchronously to disk
      fs.writeFileSync(fullPath, jsonContent, 'utf8');

      this.logger.log(
        `CRON Completed: Successfully downloaded ${products.length} products to ${filename}`,
      );
    } catch (error) {
      this.logger.error(
        'CRON Failed: Critical error occurred while pulling database product backup',
        error instanceof Error ? error.stack : error,
      );
    }
  }
}

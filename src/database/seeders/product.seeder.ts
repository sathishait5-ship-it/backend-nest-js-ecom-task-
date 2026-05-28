import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import products from '../seeds/products.json';

import {
  Product,
  ProductDocument,
} from '../../products/schemas/product.schema';

import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class ProductSeeder {
  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async seed() {
    /**
     * Check users exist first
     */
    const users = await this.userModel.find();

    if (!users.length) {
      console.log('No users found. Please run user seeder first.');

      return;
    }

    console.log(`Found ${users.length} users`);

    for (const product of products) {
      /**
       * Check existing product
       */
      const existingProduct = await this.productModel.findOne({
        name: product.name,
      });

      if (existingProduct) {
        console.log(`Product already exists: ${product.name}`);

        continue;
      }

      /**
       * Validate createdByEmail
       */
      if (!product.createdByEmail || product.createdByEmail.trim() === '') {
        console.log(`createdByEmail missing for product: ${product.name}`);

        continue;
      }

      /**
       * Find creator user
       */
      const user = await this.userModel.findOne({
        email: product.createdByEmail,
      });

      if (!user) {
        console.log(
          `User not found (${product.createdByEmail}) for product: ${product.name}`,
        );

        continue;
      }

      /**
       * Create product
       */
      await this.productModel.create({
        name: product.name,
        description: product.description,
        price: product.price,
        discountPrice: product.discountPrice,
        stock: product.stock,
        category: product.category,
        brand: product.brand,
        images: product.images,
        isActive: product.isActive,
        createdBy: user._id,
      });

      console.log(`Product created: ${product.name}`);
    }

    console.log('Product seeding completed');
  }
}

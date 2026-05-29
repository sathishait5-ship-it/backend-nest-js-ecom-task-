import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User } from '../users/schemas/user.schema';
import { Role } from '../roles/schemas/role.schema';
import { Product } from '../products/schemas/product.schema';

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<User>,

    @InjectModel(Role.name)
    private readonly roleModel: Model<Role>,

    @InjectModel(Product.name)
    private readonly productModel: Model<Product>,
  ) {}

  async getDashboardStats() {
    const [
      usersCount,
      rolesCount,
      productsCount,
      inStockCount,
      outOfStockCount,
    ] = await Promise.all([
      this.userModel.countDocuments(),

      this.roleModel.countDocuments(),

      this.productModel.countDocuments(),

      this.productModel.countDocuments({
        stock: { $gt: 0 },
      }),

      this.productModel.countDocuments({
        stock: 0,
      }),
    ]);

    return {
      success: true,
      message: 'Dashboard statistics fetched successfully',

      data: {
        usersCount,
        rolesCount,
        productsCount,
        inStockCount,
        outOfStockCount,
      },
    };
  }
}

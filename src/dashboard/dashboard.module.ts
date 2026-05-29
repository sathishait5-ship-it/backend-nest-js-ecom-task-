import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

import { User, UserSchema } from '../users/schemas/user.schema';
import { Role, RoleSchema } from '../roles/schemas/role.schema';
import { Product, ProductSchema } from '../products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Role.name, schema: RoleSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RoleSeeder } from './role.seeder';
import { UserSeeder } from './user.seeder';
import { ProductSeeder } from './product.seeder';

import { Role, RoleSchema } from '../../roles/schemas/role.schema';
import { User, UserSchema } from '../../users/schemas/user.schema';
import { Product, ProductSchema } from '../../products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Role.name, schema: RoleSchema },
      { name: User.name, schema: UserSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
  ],

  providers: [RoleSeeder, UserSeeder, ProductSeeder],

  exports: [RoleSeeder, UserSeeder, ProductSeeder],
})
export class SeederModule {}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CronsService } from './crons.service';
import { Product, ProductSchema } from '../products/schemas/product.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
  ],
  providers: [CronsService],
})
export class CronsModule {}

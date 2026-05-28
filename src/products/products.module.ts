import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { Product, ProductSchema } from './schemas/product.schema';
import { Review, ReviewSchema } from '../reviews/schemas/review.schema';
import { UserSchema } from '../users/schemas/user.schema'; // Verify your exact User structural path
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: Product.name,
        schema: ProductSchema,
      },
      {
        name: Review.name,
        schema: ReviewSchema,
      },
      {
        // Registers 'User' token so @InjectModel('User') works inside ProductsService
        name: 'User',
        schema: UserSchema,
      },
    ]),
    // Import MailModule to expose MailService to the ProductsService constructor
    MailModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}

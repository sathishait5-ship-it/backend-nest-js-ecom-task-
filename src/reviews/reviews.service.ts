import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, Types } from 'mongoose';

import { Review, ReviewDocument } from './schemas/review.schema';

import { Product, ProductDocument } from '../products/schemas/product.schema';

import { CreateReviewDto } from './dto/create-review.dto';
import { AuthUser } from '../common/interfaces/request-with-user.interface';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name)
    private reviewModel: Model<ReviewDocument>,

    @InjectModel(Product.name)
    private productModel: Model<ProductDocument>,
  ) {}

  async createReview(
    productId: string,

    createReviewDto: CreateReviewDto,

    user: AuthUser,
  ) {
    /**
     * Validate product ID
     */
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product ID');
    }

    /**
     * Check product exists
     */
    const product = await this.productModel.findById(productId);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    /**
     * Prevent duplicate reviews
     */
    const existingReview = await this.reviewModel.findOne({
      productId,

      userId: user._id,
    });

    if (existingReview) {
      throw new BadRequestException('You already reviewed this product');
    }

    /**
     * Create review
     */
    const review = await this.reviewModel.create({
      ...createReviewDto,

      productId: new Types.ObjectId(productId),

      userId: new Types.ObjectId(user._id),
    });

    return {
      message: 'Review added successfully',

      data: review,
    };
  }
}

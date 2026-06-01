import * as fs from 'fs';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, SortOrder, Types } from 'mongoose';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product, ProductDocument } from './schemas/product.schema';
import { PaginationQueryDto } from '../common/pagination/dto/pagination-query.dto';
import { getPagination } from '../common/pagination/utils/pagination.util';
import { PaginatedResponse } from '../common/pagination/interfaces/paginated-response.interface';
import type { AuthUser } from '../common/interfaces/request-with-user.interface';
import { ProductAggregateResult } from './interfaces/product-aggregate-result.interface';
import { Review, ReviewDocument } from '../reviews/schemas/review.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { MailService } from '../mail/mail.service';

interface ProductFilter {
  name?: {
    $regex: string;
    $options: string;
  };
  // Update this line to allow both query conditions
  stock?: {
    $gt?: number;
    $eq?: number;
  };
  createdAt?: {
    $gte?: Date;
    $lte?: Date;
  };
  price?: {
    $gte?: number;
    $lte?: number;
  };
  discountPrice?: {
    $gt: number;
  };
}

@Injectable()
export class ProductsService {
  // Initialize the structured NestJS Logger wrapper
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    @InjectModel(Product.name)
    private readonly productModel: Model<ProductDocument>,

    @InjectModel(Review.name)
    private readonly reviewModel: Model<ReviewDocument>,

    // Properly inject the User model instance
    @InjectModel('User')
    private readonly userModel: Model<UserDocument>,

    // Properly inject the standalone Mailer infrastructure service
    private readonly mailService: MailService,
  ) {}

  async createProduct(
    createProductDto: CreateProductDto,
    files: Express.Multer.File[],
    user: AuthUser,
  ) {
    /**
     * 1. Discount validation
     */
    if (
      createProductDto.discountPrice &&
      Number(createProductDto.discountPrice) > Number(createProductDto.price)
    ) {
      throw new BadRequestException(
        'Discount price cannot be greater than original price',
      );
    }

    /**
     * 2. Extract image paths
     */
    const imagePaths = files?.map((file) => file.path) || [];

    /**
     * 3. Create and save product document to MongoDB
     */
    const product = await this.productModel.create({
      ...createProductDto,
      images: imagePaths,
      createdBy: new Types.ObjectId(user._id),
    });

    /**
     * 4. Dispatch Email Notification Alerts (Admin, Manager, and Creator)
     */
    try {
      const recipients: string[] = [];
      if (user.email) {
        recipients.push(user.email);
      }

      // Fetch users and populate their Role document to check the role name safely
      const authorities = await this.userModel
        .find({ isActive: true })
        .populate({
          path: 'role',
          match: { name: { $in: ['admin', 'manager'] } },
        })
        .select('email role')
        .lean();

      // Filter out users whose roles didn't match the query
      authorities.forEach((auth) => {
        if (auth.role && auth.email) {
          recipients.push(auth.email);
        }
      });

      const uniqueRecipients = [...new Set(recipients)];

      if (uniqueRecipients.length > 0) {
        await this.mailService.sendProductAddedMail(uniqueRecipients, product);
        this.logger.log(
          `Product alert emails successfully dispatched to ${uniqueRecipients.length} receivers.`,
        );
      }
    } catch (mailError) {
      this.logger.error(
        'Operational warning: Product written to database, but alerting channels failed.',
        mailError instanceof Error ? mailError.stack : mailError,
      );
    }

    /**
     * 5. Return success payload
     */
    return {
      message: 'Product created successfully',
      data: product,
    };
  }

  async getAllProducts(
    query: PaginationQueryDto,
  ): Promise<PaginatedResponse<Product>> {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
      startDate,
      endDate,
      specificDate,
      inStock,
      minPrice,
      maxPrice,
      hasDiscount,
      latest,
    } = query;

    const { skip } = getPagination(page, limit);
    const filter: ProductFilter = {};

    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    if (inStock === 'true') {
      filter.stock = { $gt: 0 };
    } else if (inStock === 'false') {
      filter.stock = { $eq: 0 };
    }
    if (specificDate) {
      const startOfDay = new Date(specificDate);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(specificDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      filter.createdAt = {
        $gte: startOfDay,
        $lte: endOfDay,
      };
    }
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = minPrice;
      if (maxPrice) filter.price.$lte = maxPrice;
    }

    if (hasDiscount === 'true') {
      filter.discountPrice = { $gt: 0 };
    }

    let finalSortBy = sortBy;
    let finalSortOrder = sortOrder;

    if (latest === 'true') {
      finalSortBy = 'createdAt';
      finalSortOrder = 'desc';
    }

    const sortOptions: Record<string, SortOrder> = {
      [finalSortBy]: finalSortOrder === 'asc' ? 1 : -1,
    };

    const productsQuery = this.productModel
      .find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limit)
      .populate('createdBy', 'firstName lastName email')
      .lean();

    const totalQuery = this.productModel.countDocuments(filter);
    const [products, total] = await Promise.all([productsQuery, totalQuery]);

    return {
      data: products as unknown as Product[],
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getProductById(id: string): Promise<{ data: ProductAggregateResult }> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }

    const product = await this.productModel.aggregate<ProductAggregateResult>([
      { $match: { _id: new Types.ObjectId(id) } },
      {
        $lookup: {
          from: 'users',
          localField: 'createdBy',
          foreignField: '_id',
          as: 'createdBy',
        },
      },
      {
        $unwind: {
          path: '$createdBy',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'reviews',
          localField: '_id',
          foreignField: 'productId',
          as: 'reviews',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'reviews.userId',
          foreignField: '_id',
          as: 'reviewUsers',
        },
      },
      {
        $addFields: {
          reviews: {
            $map: {
              input: '$reviews',
              as: 'review',
              in: {
                _id: '$$review._id',
                rating: '$$review.rating',
                comment: '$$review.comment',
                createdAt: '$$review.createdAt',
                user: {
                  $let: {
                    vars: {
                      matchedUser: {
                        $arrayElemAt: [
                          {
                            $filter: {
                              input: '$reviewUsers',
                              as: 'user',
                              cond: { $eq: ['$$user._id', '$$review.userId'] },
                            },
                          },
                          0,
                        ],
                      },
                    },
                    in: {
                      _id: '$$matchedUser._id',
                      name: {
                        $trim: {
                          input: {
                            $concat: [
                              { $ifNull: ['$$matchedUser.firstName', ''] },
                              ' ',
                              { $ifNull: ['$$matchedUser.lastName', ''] },
                            ],
                          },
                        },
                      },
                      image: '$$matchedUser.image',
                    },
                  },
                },
              },
            },
          },
        },
      },
      {
        $addFields: {
          averageRating: {
            $cond: [
              { $gt: [{ $size: '$reviews' }, 0] },
              { $avg: '$reviews.rating' },
              0,
            ],
          },
          totalReviews: { $size: '$reviews' },
        },
      },
      {
        $project: {
          reviewUsers: 0,
          'createdBy.password': 0,
          'createdBy.currentToken': 0,
          'createdBy.tokenExpiresAt': 0,
        },
      },
    ]);

    if (!product.length) {
      throw new NotFoundException('Product not found');
    }

    return { data: product[0] };
  }

  async updateProduct(
    id: string,
    updateProductDto: UpdateProductDto,
    files: Express.Multer.File[],
  ) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }

    const product = await this.productModel.findById(id);

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const finalPrice = updateProductDto.price ?? product.price;

    const finalDiscountPrice =
      updateProductDto.discountPrice ?? product.discountPrice;

    if (finalDiscountPrice && finalDiscountPrice > finalPrice) {
      throw new BadRequestException(
        'Discount price cannot be greater than price',
      );
    }

    let existingImages: string[] = product.images;
    let removedImages: string[] = [];

    try {
      if (updateProductDto.existingImages) {
        const parsed: unknown = JSON.parse(updateProductDto.existingImages);

        if (Array.isArray(parsed)) {
          existingImages = parsed.filter(
            (item): item is string => typeof item === 'string',
          );
        }
      }

      if (updateProductDto.removedImages) {
        const parsed: unknown = JSON.parse(updateProductDto.removedImages);

        if (Array.isArray(parsed)) {
          removedImages = parsed.filter(
            (item): item is string => typeof item === 'string',
          );
        }
      }
    } catch {
      throw new BadRequestException('Invalid image data format');
    }

    /**
     * Start with images currently kept by frontend
     */
    let updatedImages = [...existingImages];

    /**
     * Remove deleted images
     */
    if (removedImages.length > 0) {
      for (const imagePath of removedImages) {
        try {
          if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
          }
        } catch (error) {
          console.error(`Failed to delete image: ${imagePath}`, error);
        }
      }

      updatedImages = updatedImages.filter(
        (image) => !removedImages.includes(image),
      );
    }

    /**
     * Append newly uploaded images
     */
    if (files?.length) {
      const newImages = files.map((file) => file.path);

      updatedImages.push(...newImages);
    }

    /**
     * Remove temporary request-only fields
     */
    const updateData = {
      ...updateProductDto,
    };

    delete updateData.existingImages;
    delete updateData.removedImages;

    const updatedProduct = await this.productModel.findByIdAndUpdate(
      id,
      {
        ...updateData,
        images: updatedImages,
      },
      {
        new: true,
        runValidators: true,
      },
    );

    return {
      message: 'Product updated successfully',
      data: updatedProduct,
    };
  }

  async deleteProduct(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product ID');
    }

    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    for (const imagePath of product.images || []) {
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await this.reviewModel.deleteMany({
      productId: new Types.ObjectId(id),
    });

    await this.productModel.findByIdAndDelete(id);

    return {
      message: 'Product and related reviews deleted successfully',
    };
  }
}

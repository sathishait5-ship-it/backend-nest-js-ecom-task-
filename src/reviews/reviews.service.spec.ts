import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Review } from './schemas/review.schema';
import { Product } from '../products/schemas/product.schema';
import { Types } from 'mongoose';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let mockReviewModel: any;
  let mockProductModel: any;

  const mockUser = {
    _id: new Types.ObjectId().toString(),
    email: 'buyer@test.com',
    role: { _id: 'r1', name: 'user', permissions: [] },
  };

  beforeEach(async () => {
    mockReviewModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    mockProductModel = {
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: getModelToken(Review.name), useValue: mockReviewModel },
        { provide: getModelToken(Product.name), useValue: mockProductModel },
      ],
    }).compile();

    service = module.get<ReviewsService>(ReviewsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReview', () => {
    it('should throw BadRequestException if the provided productId is malformed', async () => {
      const dto = { rating: 5, comment: 'Great!' };

      await expect(service.createReview('invalid-id', dto, mockUser as any)).rejects.toThrow(
        new BadRequestException('Invalid product ID'),
      );
    });

    it('should throw NotFoundException if the product does not exist in the database', async () => {
      const validId = new Types.ObjectId().toString();
      const dto = { rating: 5, comment: 'Great!' };
      mockProductModel.findById.mockResolvedValue(null);

      await expect(service.createReview(validId, dto, mockUser as any)).rejects.toThrow(
        new NotFoundException('Product not found'),
      );
    });

    it('should throw BadRequestException if the user has already left a review on this product', async () => {
      const validId = new Types.ObjectId().toString();
      const dto = { rating: 5, comment: 'Another comment' };
      
      mockProductModel.findById.mockResolvedValue({ _id: validId });
      mockReviewModel.findOne.mockResolvedValue({ _id: 'existing_review_id' });

      await expect(service.createReview(validId, dto, mockUser as any)).rejects.toThrow(
        new BadRequestException('You already reviewed this product'),
      );
      expect(mockReviewModel.findOne).toHaveBeenCalledWith({
        productId: validId,
        userId: mockUser._id,
      });
    });

    it('should successfully link references and save the review document', async () => {
      const validId = new Types.ObjectId().toString();
      const dto = { rating: 4, comment: 'Very good quality' };
      const createdReviewDoc = { _id: 'rev_999', ...dto, productId: validId, userId: mockUser._id };

      mockProductModel.findById.mockResolvedValue({ _id: validId });
      mockReviewModel.findOne.mockResolvedValue(null);
      mockReviewModel.create.mockResolvedValue(createdReviewDoc);

      const result = await service.createReview(validId, dto, mockUser as any);

      expect(mockReviewModel.create).toHaveBeenCalledWith({
        ...dto,
        productId: expect.any(Types.ObjectId),
        userId: expect.any(Types.ObjectId),
      });
      expect(result.message).toBe('Review added successfully');
      expect(result.data).toEqual(createdReviewDoc);
    });
  });
});
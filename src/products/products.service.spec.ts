import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { Product } from './schemas/product.schema';
import { Review } from '../reviews/schemas/review.schema';
import { Types } from 'mongoose';
import * as fs from 'fs';

// Mock fs filesystem module to protect local disk storage from test side-effects
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn(),
}));

describe('ProductsService', () => {
  let service: ProductsService;
  let mockProductModel: any;
  let mockReviewModel: any;
  let mockUserModel: any;
  let mockMailService: Partial<MailService>;

  beforeEach(async () => {
    // 1. Create a chainable spy foundation for Product model queries
    mockProductModel = {
      create: jest.fn(),
      find: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      countDocuments: jest.fn(),
      aggregate: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      findByIdAndDelete: jest.fn(),
    };

    // 2. Create a chainable spy foundation for User model queries
    mockUserModel = {
      find: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      lean: jest.fn(),
    };

    // 3. Create a spy foundation for Review model queries
    mockReviewModel = {
      deleteMany: jest.fn(),
    };

    mockMailService = {
      sendProductAddedMail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(Review.name), useValue: mockReviewModel },
        { provide: getModelToken('User'), useValue: mockUserModel },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createProduct', () => {
    const mockUser = {
      _id: new Types.ObjectId().toString(),
      email: 'admin@test.com',
      role: { _id: 'r1', name: 'admin', permissions: [] },
    };
    const mockFiles = [{ path: 'uploads/p1.png' }] as Express.Multer.File[];

    it('should throw BadRequestException if discountPrice exceeds original price', async () => {
      const dto = { name: 'Phone', price: 100, discountPrice: 150, stock: 10 };

      await expect(
        service.createProduct(dto as any, mockFiles, mockUser as any),
      ).rejects.toThrow(
        new BadRequestException(
          'Discount price cannot be greater than original price',
        ),
      );
    });

    it('should successfully save product and dispatch alert emails to admin/managers', async () => {
      const dto = { name: 'Phone', price: 100, discountPrice: 80, stock: 10 };
      const createdDoc = {
        _id: 'prod_123',
        ...dto,
        images: ['uploads/p1.png'],
      };

      mockProductModel.create.mockResolvedValue(createdDoc);
      mockUserModel.lean.mockResolvedValue([
        { email: 'mgr@test.com', role: { name: 'manager' } },
      ]);

      const result = await service.createProduct(
        dto as any,
        mockFiles,
        mockUser,
      );

      expect(mockProductModel.create).toHaveBeenCalled();
      expect(mockMailService.sendProductAddedMail).toHaveBeenCalled();
      expect(result.message).toBe('Product created successfully');
    });
  });

  describe('getAllProducts', () => {
    it('should calculate pagination and apply query filters properly', async () => {
      const queryDto = { page: 1, limit: 5, search: 'laptop', inStock: 'true' };

      mockProductModel.lean.mockResolvedValue([{ name: 'Gaming Laptop' }]);
      mockProductModel.countDocuments.mockResolvedValue(1);

      const result = await service.getAllProducts(queryDto);

      expect(mockProductModel.find).toHaveBeenCalledWith(
        expect.objectContaining({
          name: { $regex: 'laptop', $options: 'i' },
          stock: { $gt: 0 },
        }),
      );
      expect(result.pagination.total).toBe(1);
      expect(result.data).toHaveLength(1);
    });
  });

  describe('getProductById', () => {
    it('should throw BadRequestException for malformed object IDs', async () => {
      await expect(service.getProductById('invalid-id')).rejects.toThrow(
        new BadRequestException('Invalid product ID'),
      );
    });

    it('should throw NotFoundException if aggregate query yields an empty array', async () => {
      const validId = new Types.ObjectId().toString();
      mockProductModel.aggregate.mockResolvedValue([]);

      await expect(service.getProductById(validId)).rejects.toThrow(
        new NotFoundException('Product not found'),
      );
    });

    it('should return aggregated data matrix if found', async () => {
      const validId = new Types.ObjectId().toString();
      const mockAggResult = [
        { _id: validId, name: 'Tablet', averageRating: 4.5 },
      ];
      mockProductModel.aggregate.mockResolvedValue(mockAggResult);

      const result = await service.getProductById(validId);
      expect(result.data).toEqual(mockAggResult[0]);
    });
  });

  describe('deleteProduct', () => {
    it('should sweep related reviews and call findByIdAndDelete', async () => {
      const validId = new Types.ObjectId().toString();
      mockProductModel.findById.mockResolvedValue({
        _id: validId,
        images: ['path/img.png'],
      });
      mockReviewModel.deleteMany.mockResolvedValue({});
      mockProductModel.findByIdAndDelete.mockResolvedValue({});

      const result = await service.deleteProduct(validId);

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockReviewModel.deleteMany).toHaveBeenCalled();
      expect(mockProductModel.findByIdAndDelete).toHaveBeenCalledWith(validId);
      expect(result.message).toBe(
        'Product and related reviews deleted successfully',
      );
    });
  });
});

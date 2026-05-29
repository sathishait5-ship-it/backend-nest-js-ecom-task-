import { Test, TestingModule } from '@nestjs/testing';
import { ProductSeeder } from './product.seeder';
import { getModelToken } from '@nestjs/mongoose';
import { Product } from '../../products/schemas/product.schema';
import { User } from '../../users/schemas/user.schema';

// Mock raw product seeds data structure
jest.mock(
  '../seeds/products.json',
  () => [
    {
      name: 'Wireless Mouse',
      description: 'High precision mouse',
      price: 25,
      stock: 100,
      createdByEmail: 'merchant@test.com',
    },
  ],
  { virtual: true },
);

describe('ProductSeeder', () => {
  let seeder: ProductSeeder;
  let mockProductModel: any;
  let mockUserModel: any;

  beforeEach(async () => {
    mockProductModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    mockUserModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductSeeder,
        { provide: getModelToken(Product.name), useValue: mockProductModel },
        { provide: getModelToken(User.name), useValue: mockUserModel },
      ],
    }).compile();

    seeder = module.get<ProductSeeder>(ProductSeeder);
    jest.clearAllMocks();
  });

  describe('seed', () => {
    it('should log a message and exit if user documents do not exist', async () => {
      mockUserModel.find.mockResolvedValue([]);

      await seeder.seed();

      expect(mockProductModel.findOne).not.toHaveBeenCalled();
    });

    it('should skip creation if a matching product name is found', async () => {
      mockUserModel.find.mockResolvedValue([{ _id: 'u1' }]);
      mockProductModel.findOne.mockResolvedValue({ name: 'Wireless Mouse' });

      await seeder.seed();

      expect(mockUserModel.findOne).not.toHaveBeenCalled();
      expect(mockProductModel.create).not.toHaveBeenCalled();
    });

    it('should establish links using user documents and seed successfully', async () => {
      mockUserModel.find.mockResolvedValue([{ _id: 'user_merchant_77' }]);
      mockProductModel.findOne.mockResolvedValue(null);
      mockUserModel.findOne.mockResolvedValue({
        _id: 'user_merchant_77',
        email: 'merchant@test.com',
      });
      mockProductModel.create.mockResolvedValue({});

      await seeder.seed();

      expect(mockUserModel.findOne).toHaveBeenCalledWith({
        email: 'merchant@test.com',
      });
      expect(mockProductModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Wireless Mouse',
          createdBy: 'user_merchant_77',
        }),
      );
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { CronsService } from './crons.service';
import { getModelToken } from '@nestjs/mongoose';
import { Product } from '../products/schemas/product.schema';
import { Logger } from '@nestjs/common';
import * as fs from 'fs';

// Mock fs filesystem methods to protect local storage from writing real backup files
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  writeFileSync: jest.fn(),
}));

describe('CronsService', () => {
  let service: CronsService;
  let mockProductModel: any;

  beforeEach(async () => {
    mockProductModel = {
      find: jest.fn().mockReturnThis(),
      lean: jest.fn(),
    };

    // Correctly intercept the NestJS Logger prototype cleanly using direct imports
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronsService,
        {
          provide: getModelToken(Product.name),
          useValue: mockProductModel,
        },
      ],
    }).compile();

    service = module.get<CronsService>(CronsService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('onModuleInit', () => {
    it('should create the backup directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      service.onModuleInit();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should skip directory creation if the backup directory already exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      service.onModuleInit();

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('downloadProductsBackup', () => {
    it('should return early if no products are found in the database', async () => {
      mockProductModel.lean.mockResolvedValue([]);

      await service.downloadProductsBackup();

      expect(mockProductModel.find).toHaveBeenCalled();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('should successfully write data to a JSON backup file when products exist', async () => {
      const mockProducts = [
        { _id: 'p1', name: 'Product A', price: 10 },
        { _id: 'p2', name: 'Product B', price: 20 },
      ];
      mockProductModel.lean.mockResolvedValue(mockProducts);

      await service.downloadProductsBackup();

      expect(mockProductModel.find).toHaveBeenCalled();
      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining('Product A'),
        'utf8',
      );
    });

    it('should gracefully handle and log errors if database fetch fails', async () => {
      mockProductModel.lean.mockRejectedValue(new Error('Database disconnected'));

      // Should not throw exception upwards because it is trapped inside a try/catch block
      await expect(service.downloadProductsBackup()).resolves.not.toThrow();
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
  });
});
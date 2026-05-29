import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

describe('ProductsController', () => {
  let controller: ProductsController;
  let mockProductsService: Partial<ProductsService>;

  const mockFiles = [{ path: 'uploads/img.jpg' }] as Express.Multer.File[];
  const mockReq = { user: { _id: 'user_99', email: 'seller@test.com' } };

  beforeEach(async () => {
    mockProductsService = {
      createProduct: jest
        .fn()
        .mockResolvedValue({ message: 'Created', data: {} }),
      getAllProducts: jest.fn().mockResolvedValue({ data: [], pagination: {} }),
      getProductById: jest.fn().mockResolvedValue({ data: {} }),
      updateProduct: jest.fn().mockResolvedValue({ message: 'Updated' }),
      deleteProduct: jest.fn().mockResolvedValue({ message: 'Deleted' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [{ provide: ProductsService, useValue: mockProductsService }],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createProduct', () => {
    it('should direct body, files, and requesting user straight to service tier', async () => {
      const dto = { name: 'Cap', price: 15, stock: 50 };
      const result = await controller.createProduct(
        dto as any,
        mockFiles,
        mockReq as any,
      );
      expect(mockProductsService.createProduct).toHaveBeenCalledWith(
        dto,
        mockFiles,
        mockReq.user,
      );
      expect(result.message).toBe('Created');
    });
  });

  describe('getAllProducts', () => {
    it('should forward search query parameters', async () => {
      const query = { page: 1, limit: 10 };
      await controller.getAllProducts(query);
      expect(mockProductsService.getAllProducts).toHaveBeenCalledWith(query);
    });
  });

  describe('getProductById', () => {
    it('should pass target id parameters down', async () => {
      await controller.getProductById('prod_id');
      expect(mockProductsService.getProductById).toHaveBeenCalledWith(
        'prod_id',
      );
    });
  });

  describe('updateProduct', () => {
    it('should forward update modifications and attachments', async () => {
      const updateDto = { price: 20 };
      const result = await controller.updateProduct(
        'prod_id',
        updateDto,
        mockFiles,
      );
      expect(mockProductsService.updateProduct).toHaveBeenCalledWith(
        'prod_id',
        updateDto,
        mockFiles,
      );
      expect(result.message).toBe('Updated');
    });
  });

  describe('deleteProduct', () => {
    it('should trigger complete purge routine commands', async () => {
      const result = await controller.deleteProduct('prod_id');
      expect(mockProductsService.deleteProduct).toHaveBeenCalledWith('prod_id');
      expect(result.message).toBe('Deleted');
    });
  });
});

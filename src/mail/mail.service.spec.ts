import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';
import { getQueueToken } from '@nestjs/bull';
import { Types } from 'mongoose';

describe('MailService', () => {
  let service: MailService;
  let mockQueue: any;

  beforeEach(async () => {
    mockQueue = {
      add: jest.fn().mockResolvedValue({ id: 'job_id_123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: getQueueToken('mail_queue'),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendWelcomeMail', () => {
    it('should push a welcome_job to the queue with retry settings', async () => {
      const result = await service.sendWelcomeMail('user@test.com', 'John');

      expect(mockQueue.add).toHaveBeenCalledWith(
        'welcome_job',
        { to: 'user@test.com', name: 'John' },
        { attempts: 3, backoff: 5000, removeOnComplete: true },
      );
      expect(result.message).toBe('Welcome mail enqueued successfully');
    });
  });

  describe('sendProductAddedMail', () => {
    it('should format file paths to web URLs and add product_added_job to the queue', async () => {
      const mockProduct = {
        name: 'Shoes',
        description: 'Sporty shoes',
        price: 100,
        discountPrice: 80,
        stock: 10,
        category: 'Footwear',
        brand: 'BrandX',
        images: ['uploads\\img1.png', 'uploads/img2.png'],
        createdBy: new Types.ObjectId(),
      };

      const result = await service.sendProductAddedMail(
        ['admin@test.com'],
        mockProduct as any,
      );

      expect(mockQueue.add).toHaveBeenCalledWith(
        'product_added_job',
        expect.objectContaining({
          recipients: ['admin@test.com'],
          templateContext: expect.objectContaining({
            name: 'Shoes',
            images: [
              'http://localhost:8080/uploads/img1.png',
              'http://localhost:8080/uploads/img2.png',
            ],
          }),
        }),
        { attempts: 3, backoff: 10000, removeOnComplete: true },
      );
      expect(result.message).toBe(
        'Product notification emails enqueued successfully.',
      );
    });
  });
});

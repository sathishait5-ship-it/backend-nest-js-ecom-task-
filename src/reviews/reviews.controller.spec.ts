import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let mockReviewsService: Partial<ReviewsService>;

  beforeEach(async () => {
    mockReviewsService = {
      createReview: jest
        .fn()
        .mockResolvedValue({ message: 'Review added successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [{ provide: ReviewsService, useValue: mockReviewsService }],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createReview', () => {
    it('should correctly extract route parameters and forward payloads down onto the service layer', async () => {
      const productId = 'prod_id_123';
      const dto: CreateReviewDto = { rating: 5, comment: 'Excellent' };
      const mockReq = {
        user: { _id: 'user_id_456', email: 'tester@test.com' },
      };

      const result = await controller.createReview(
        productId,
        dto,
        mockReq as any,
      );

      expect(mockReviewsService.createReview).toHaveBeenCalledWith(
        productId,
        dto,
        mockReq.user,
      );
      expect(result.message).toBe('Review added successfully');
    });
  });
});

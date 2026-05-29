import { Test, TestingModule } from '@nestjs/testing';
import { MailController } from './mail.controller';
import { MailService } from './mail.service';

describe('MailController', () => {
  let controller: MailController;
  let mockMailService: Partial<MailService>;

  beforeEach(async () => {
    mockMailService = {
      sendWelcomeMail: jest
        .fn()
        .mockResolvedValue({ message: 'Welcome mail enqueued successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MailController],
      providers: [{ provide: MailService, useValue: mockMailService }],
    }).compile();

    controller = module.get<MailController>(MailController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendWelcome', () => {
    it('should forward query parameters down to the service', async () => {
      const result = await controller.sendWelcome('alice@test.com', 'Alice');

      expect(mockMailService.sendWelcomeMail).toHaveBeenCalledWith(
        'alice@test.com',
        'Alice',
      );
      expect(result.message).toBe('Welcome mail enqueued successfully');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { MailProcessor } from './mail.processor';
import { MailerService } from '@nestjs-modules/mailer';

describe('MailProcessor', () => {
  let processor: MailProcessor;
  let mockMailerService: any;

  beforeEach(async () => {
    mockMailerService = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'sent_123' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailProcessor,
        { provide: MailerService, useValue: mockMailerService },
      ],
    }).compile();

    processor = module.get<MailProcessor>(MailProcessor);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleWelcomeMail', () => {
    it('should parse job metadata and call mailerService', async () => {
      const mockJob: any = {
        data: { to: 'welcome@test.com', name: 'Guest' },
      };

      await processor.handleWelcomeMail(mockJob);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'welcome@test.com',
        subject: 'Welcome to Our Platform!',
        template: 'welcome',
        context: { name: 'Guest' },
      });
    });

    it('should bubble up exceptions if the mailer configuration fails', async () => {
      const mockJob: any = { data: { to: 'bad@test.com', name: 'Test' } };
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP down'));

      await expect(processor.handleWelcomeMail(mockJob)).rejects.toThrow(
        'SMTP down',
      );
    });
  });

  describe('handleProductAddedMail', () => {
    it('should broadcast email blasts to multiple recipients with remote file attachments', async () => {
      const mockJob: any = {
        data: {
          recipients: ['m1@test.com', 'm2@test.com'],
          templateContext: { name: 'Gizmo', price: 99 },
        },
      };

      await processor.handleProductAddedMail(mockJob);

      expect(mockMailerService.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['m1@test.com', 'm2@test.com'],
          template: 'product-added',
          attachments: expect.any(Array),
        }),
      );
    });
  });
});

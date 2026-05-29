import { Test, TestingModule } from '@nestjs/testing';
import { JwtStrategy } from './jwt.strategy';
import { getModelToken } from '@nestjs/mongoose';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import {
  mockMongooseModelFactory,
  mockConfigServiceFactory,
} from '../../../test/mocks/mongoose-bull.mock';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let mockUserModel: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockUserModel = mockMongooseModelFactory();
    mockConfigService = mockConfigServiceFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    const payload = { sub: 'user_123', email: 'test@example.com' };

    it('should throw UnauthorizedException if user does not exist', async () => {
      mockUserModel.findById.mockReturnThis();
      mockUserModel.populate.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('User not found'),
      );
    });

    it('should throw UnauthorizedException if currentToken is missing (no active session)', async () => {
      const mockUser = { _id: 'user_123', currentToken: null };
      mockUserModel.findById.mockReturnThis();
      mockUserModel.populate.mockResolvedValue(mockUser);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Session expired. Please login again'),
      );
    });

    it('should handle token expiration, clear the session parameters in DB, and throw UnauthorizedException', async () => {
      const pastDate = new Date(Date.now() - 10000); // 10 seconds ago
      const mockUser = {
        _id: 'user_123',
        currentToken: 'some_token',
        tokenExpiresAt: pastDate,
      };

      mockUserModel.findById.mockReturnThis();
      mockUserModel.populate.mockResolvedValue(mockUser);
      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        new UnauthorizedException('Login expired. Please login again'),
      );

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith('user_123', {
        currentToken: null,
        tokenExpiresAt: null,
      });
    });

    it('should return the populated user document when session is perfectly valid', async () => {
      const futureDate = new Date(Date.now() + 50000);
      const mockUser = {
        _id: 'user_123',
        currentToken: 'some_token',
        tokenExpiresAt: futureDate,
        role: { name: 'admin', permissions: ['manage_users'] },
      };

      mockUserModel.findById.mockReturnThis();
      mockUserModel.populate.mockResolvedValue(mockUser);

      const result = await strategy.validate(payload);

      expect(mockUserModel.findById).toHaveBeenCalledWith('user_123');
      expect(result).toEqual(mockUser);
    });
  });
});

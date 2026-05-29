import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { getModelToken } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

// Mock the whole bcrypt module globally for this file to prevent read-only errors
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));
// Explicitly import it after mocking so we can reference its mock instances
import * as bcrypt from 'bcrypt';
import { mockMongooseModelFactory } from '../../test/mocks/mongoose-bull.mock';

describe('AuthService', () => {
  let service: AuthService;
  let mockUserModel: any;
  let mockJwtService: Partial<JwtService>;

  beforeEach(async () => {
    mockUserModel = mockMongooseModelFactory();
    mockJwtService = {
      signAsync: jest.fn().mockResolvedValue('mock_access_token'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken('User'),
          useValue: mockUserModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    // Clear mock histories between every test block run
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    const loginDto = { email: 'user@test.com', password: 'Password123' };

    it('should throw UnauthorizedException if user does not exist', async () => {
      mockUserModel.findOne.mockReturnThis();
      mockUserModel.populate.mockResolvedValue(null);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('should throw UnauthorizedException if password does not match', async () => {
      const mockUser = { email: 'user@test.com', password: 'hashedPassword' };
      mockUserModel.findOne.mockReturnThis();
      mockUserModel.populate.mockResolvedValue(mockUser);

      // Control mock return value using our module mock reference
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid email or password'),
      );
    });

    it('should throw BadRequestException if user account is inactive', async () => {
      const mockUser = {
        email: 'user@test.com',
        password: 'hashedPassword',
        isActive: false,
      };
      mockUserModel.findOne.mockReturnThis();
      mockUserModel.populate.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        new BadRequestException('User account is inactive'),
      );
    });

    it('should throw UnauthorizedException if an active session already exists', async () => {
      const futureDate = new Date(Date.now() + 50000);
      const mockUser = {
        email: 'user@test.com',
        password: 'hashedPassword',
        isActive: true,
        currentToken: 'existing_token',
        tokenExpiresAt: futureDate,
      };
      mockUserModel.findOne.mockReturnThis();
      mockUserModel.populate.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.login(loginDto)).rejects.toThrow(
        new UnauthorizedException(
          'An active session already exists. Please logout first or wait until the session expires',
        ),
      );
    });

    it('should complete login successfully and update the current token parameters', async () => {
      const mockUser = {
        _id: 'user_id_123',
        email: 'user@test.com',
        password: 'hashedPassword',
        isActive: true,
        firstName: 'John',
        lastName: 'Doe',
        role: { name: 'admin', permissions: ['create_product'] },
      };

      mockUserModel.findOne.mockReturnThis();
      mockUserModel.populate.mockResolvedValueOnce(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);
      mockUserModel.findById.mockReturnThis();
      mockUserModel.populate.mockResolvedValueOnce(mockUser);

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('message', 'Login successful');
      expect(result).toHaveProperty('token', 'mock_access_token');
      expect(result.user.fullName).toBe('John Doe');
      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user_id_123',
        expect.any(Object),
      );
    });
  });

  describe('logout', () => {
    it('should nullify current tokens and return a success payload', async () => {
      mockUserModel.findByIdAndUpdate.mockResolvedValue(null);

      const result = await service.logout('user_id_123');

      expect(mockUserModel.findByIdAndUpdate).toHaveBeenCalledWith(
        'user_id_123',
        {
          currentToken: null,
          tokenExpiresAt: null,
        },
      );
      expect(result).toEqual({ message: 'Logout successful' });
    });
  });
});

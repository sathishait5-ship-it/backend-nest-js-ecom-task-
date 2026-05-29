import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let mockAuthService: Partial<AuthService>;

  beforeEach(async () => {
    // Setting up the mocked implementation of our service methods
    mockAuthService = {
      login: jest.fn().mockResolvedValue({
        message: 'Login successful',
        token: 'mock_jwt_token',
        tokenExpiresAt: new Date(),
        user: { _id: 'user_123', fullName: 'John Doe', image: null },
      }),
      logout: jest.fn().mockResolvedValue({
        message: 'Logout successful',
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should invoke authService.login with matching credentials', async () => {
      const loginDto: LoginDto = {
        email: 'test@example.com',
        password: 'securePassword123',
      };

      const result = await controller.login(loginDto);

      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toHaveProperty('token', 'mock_jwt_token');
      expect(result.message).toBe('Login successful');
    });
  });

  describe('logout', () => {
    it('should invoke authService.logout with the active request user id', async () => {
      // Mocking the express request object injected via Passport JWT Guard
      const mockReq = {
        user: {
          _id: 'user_abc_123',
        },
      };

      const result = await controller.logout(mockReq);

      expect(mockAuthService.logout).toHaveBeenCalledWith('user_abc_123');
      expect(result).toEqual({ message: 'Logout successful' });
    });
  });
});
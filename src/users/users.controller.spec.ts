import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;
  let mockUsersService: Partial<UsersService>;

  const mockFile = { filename: 'profile.jpg' } as Express.Multer.File;

  beforeEach(async () => {
    mockUsersService = {
      register: jest
        .fn()
        .mockResolvedValue({ _id: 'user_123', message: 'Registered' }),
      getUsers: jest
        .fn()
        .mockResolvedValue([{ _id: 'user_123', email: 'test@test.com' }]),
      getAllUserEssentials: jest
        .fn()
        .mockResolvedValue([{ name: 'John Doe', email: 'john@test.com' }]),
      updateUser: jest
        .fn()
        .mockResolvedValue({ _id: 'user_123', updated: true }),
      deleteUser: jest
        .fn()
        .mockResolvedValue({ message: 'User deleted successfully' }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: mockUsersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should invoke service register layer with body variables and file attachment', async () => {
      // Added dummy phone and address properties to satisfy CreateUserDto structural requirements
      const dto = {
        email: 'test@test.com',
        password: '123',
        firstName: 'A',
        lastName: 'B',
        phone: '1234567890',
        address: 'Coimbatore',
      };

      const result = await controller.register(dto, mockFile);
      expect(mockUsersService.register).toHaveBeenCalledWith(dto, mockFile);
      expect(result).toHaveProperty('message', 'Registered');
    });
  });

  describe('getUsers', () => {
    it('should invoke service getUsers', async () => {
      const result = await controller.getUsers();
      expect(mockUsersService.getUsers).toHaveBeenCalled();
      expect(result).toHaveLength(1);
    });
  });

  describe('getAllUserEssentials', () => {
    it('should trigger aggregate data fetch logic', async () => {
      const result = await controller.getAllUserEssentials();
      expect(mockUsersService.getAllUserEssentials).toHaveBeenCalled();
      expect(result[0]).toHaveProperty('name', 'John Doe');
    });
  });

  describe('updateUser', () => {
    it('should pass target id parameters and modification payloads down onto your service tier', async () => {
      const updateDto = { firstName: 'UpdatedName' };
      const result = await controller.updateUser(
        'user_123',
        updateDto,
        mockFile,
      );
      expect(mockUsersService.updateUser).toHaveBeenCalledWith(
        'user_123',
        updateDto,
        mockFile,
      );
      expect(result).toHaveProperty('updated', true);
    });
  });

  describe('deleteUser', () => {
    it('should prompt user document purges', async () => {
      const result = await controller.deleteUser('user_123');
      expect(mockUsersService.deleteUser).toHaveBeenCalledWith('user_123');
      expect(result).toEqual({ message: 'User deleted successfully' });
    });
  });
});

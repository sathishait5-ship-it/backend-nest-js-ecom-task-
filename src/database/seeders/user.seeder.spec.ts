import { Test, TestingModule } from '@nestjs/testing';
import { UserSeeder } from './user.seeder';
import { getModelToken } from '@nestjs/mongoose';
import { User } from '../../users/schemas/user.schema';
import { Role } from '../../roles/schemas/role.schema';
import * as bcrypt from 'bcrypt';

// 1. Mock raw users json source file parameters
jest.mock('../seeds/users.json', () => [
  {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john@test.com',
    password: 'securePassword123',
    role: 'admin',
  }
], { virtual: true });

// 2. Mock bcrypt at the module boundary to bypass C++ binding immutability
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed_string'),
}));

describe('UserSeeder', () => {
  let seeder: UserSeeder;
  let mockUserModel: any;
  let mockRoleModel: any;

  beforeEach(async () => {
    mockUserModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    mockRoleModel = {
      find: jest.fn(),
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserSeeder,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Role.name), useValue: mockRoleModel },
      ],
    }).compile();

    seeder = module.get<UserSeeder>(UserSeeder);
    jest.clearAllMocks();
  });

  describe('seed', () => {
    it('should abort cleanly if role matrix collections are missing', async () => {
      mockRoleModel.find.mockResolvedValue([]);

      await seeder.seed();

      expect(mockUserModel.findOne).not.toHaveBeenCalled();
    });

    it('should bypass creating existing users', async () => {
      mockRoleModel.find.mockResolvedValue([{ _id: 'role_123' }]);
      mockUserModel.findOne.mockResolvedValue({ email: 'john@test.com' });

      await seeder.seed();

      expect(mockUserModel.create).not.toHaveBeenCalled();
    });

    it('should encrypt passwords and resolve mappings successfully', async () => {
      const mockRoleId = 'role_admin_555';
      
      // Setup successful query responses so code paths flow all the way to create()
      mockRoleModel.find.mockResolvedValue([{ _id: mockRoleId }]);
      mockUserModel.findOne.mockResolvedValue(null);
      mockRoleModel.findOne.mockResolvedValue({ _id: mockRoleId, name: 'admin' });
      mockUserModel.create.mockResolvedValue({});

      await seeder.seed();

      // Verify bcrypt mock was hit cleanly
      expect(bcrypt.hash).toHaveBeenCalledWith('securePassword123', 10);
      
      // Verify database payload mapped fields correctly
      expect(mockUserModel.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'john@test.com',
          password: 'hashed_string',
          role: mockRoleId,
        }),
      );
    });
  });
});
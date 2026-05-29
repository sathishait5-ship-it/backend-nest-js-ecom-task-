import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { MailService } from '../mail/mail.service';
import { User } from './schemas/user.schema';
import { Role } from '../roles/schemas/role.schema';
import * as fs from 'fs';

// Mock dependency modules to control side effects completely
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('mocked_hashed_password'),
}));
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn(),
}));

import * as bcrypt from 'bcrypt';
import { mockMongooseModelFactory } from '../../test/mocks/mongoose-bull.mock';

describe('UsersService', () => {
  let service: UsersService;
  let mockUserModel: any;
  let mockRoleModel: any;
  let mockMailService: Partial<MailService>;

  beforeEach(async () => {
    mockUserModel = mockMongooseModelFactory();
    mockRoleModel = mockMongooseModelFactory();
    mockMailService = {
      sendWelcomeMail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getModelToken(User.name), useValue: mockUserModel },
        { provide: getModelToken(Role.name), useValue: mockRoleModel },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('register', () => {
    const createUserDto = {
      email: 'sathish@test.com',
      password: 'Password123',
      firstName: 'Sathish',
      lastName: 'Kumar',
      phone: '1234567890',
      address: 'Coimbatore',
      roleId: 'custom_role_id_123',
    };

    const mockMulterFile = {
      filename: 'avatar.png',
    } as Express.Multer.File;

    it('should throw BadRequestException if email already exists', async () => {
      mockUserModel.findOne.mockResolvedValue({ _id: 'existing_id' });

      await expect(service.register(createUserDto, mockMulterFile)).rejects.toThrow(
        new BadRequestException('Email already exists'),
      );
    });

    it('should successfully register a user with a custom role and fire off a welcome mail', async () => {
      mockUserModel.findOne.mockResolvedValue(null); // No existing email
      mockRoleModel.findById.mockResolvedValue({ _id: 'custom_role_id_123' });
      mockUserModel.create.mockResolvedValue({
        _id: 'new_user_99',
        email: 'sathish@test.com',
        firstName: 'Sathish',
        lastName: 'Kumar',
      });
      mockUserModel.findById.mockReturnThis();
      mockUserModel.populate.mockResolvedValue({
        _id: 'new_user_99',
        email: 'sathish@test.com',
        role: { name: 'admin' },
      });

      const result = await service.register(createUserDto, mockMulterFile);

      expect(bcrypt.hash).toHaveBeenCalledWith('Password123', 10);
      expect(mockMailService.sendWelcomeMail).toHaveBeenCalledWith('sathish@test.com', 'Sathish Kumar');
      expect(result).toHaveProperty('email', 'sathish@test.com');
    });

    it('should default to customer role lookup if roleId is not provided', async () => {
      const dtoWithoutRole = { ...createUserDto, roleId: undefined };
      mockUserModel.findOne.mockResolvedValueOnce(null); // for email check
      mockRoleModel.findOne.mockResolvedValue({ _id: 'customer_role_id' }); // for fallback lookup
      mockUserModel.create.mockResolvedValue({ _id: 'user_id' });
      mockUserModel.findById.mockReturnThis();
      mockUserModel.populate.mockResolvedValue({ _id: 'user_id' });

      await service.register(dtoWithoutRole, mockMulterFile);

      expect(mockRoleModel.findOne).toHaveBeenCalledWith({ name: 'customer' });
    });
  });

  describe('getUsers', () => {
    it('should fetch all users and populate roles', async () => {
      mockUserModel.find.mockReturnThis();
      mockUserModel.populate.mockResolvedValue([{ email: 'user@test.com' }]);

      const result = await service.getUsers();
      expect(result).toHaveLength(1);
    });
  });

  describe('getAllUserEssentials', () => {
    it('should run aggregation pipeline mapping and return tailored properties', async () => {
      const mockAggregationResult = [
        { name: 'Sathish Kumar', email: 'sathish@test.com', roleName: 'customer', permissions: [] },
      ];
      mockUserModel.aggregate.mockResolvedValue(mockAggregationResult);

      const result = await service.getAllUserEssentials();
      expect(mockUserModel.aggregate).toHaveBeenCalledWith(expect.any(Array));
      expect(result).toEqual(mockAggregationResult);
    });
  });

  describe('deleteUser', () => {
    it('should throw BadRequestException if user is not found', async () => {
      mockUserModel.findById.mockResolvedValue(null);

      await expect(service.deleteUser('invalid_id')).rejects.toThrow(
        new BadRequestException('User not found'),
      );
    });

    it('should clear old filesystem imagery links and remove user document from database', async () => {
      mockUserModel.findById.mockResolvedValue({ _id: 'user_1', image: '/uploads/userImages/old.png' });
      mockUserModel.findByIdAndDelete.mockResolvedValue(null);

      const result = await service.deleteUser('user_1');

      expect(fs.existsSync).toHaveBeenCalled();
      expect(fs.unlinkSync).toHaveBeenCalled();
      expect(mockUserModel.findByIdAndDelete).toHaveBeenCalledWith('user_1');
      expect(result).toEqual({ message: 'User deleted successfully' });
    });
  });
});
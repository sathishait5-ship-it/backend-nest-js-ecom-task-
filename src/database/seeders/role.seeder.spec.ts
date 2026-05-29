import { Test, TestingModule } from '@nestjs/testing';
import { RoleSeeder } from './role.seeder';
import { getModelToken } from '@nestjs/mongoose';
import { Role } from '../../roles/schemas/role.schema';

// Mock the raw seed json dataset array
jest.mock(
  '../seeds/roles.json',
  () => [{ name: 'admin' }, { name: 'manager' }],
  { virtual: true },
);

describe('RoleSeeder', () => {
  let seeder: RoleSeeder;
  let mockRoleModel: any;

  beforeEach(async () => {
    mockRoleModel = {
      findOne: jest.fn(),
      create: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoleSeeder,
        { provide: getModelToken(Role.name), useValue: mockRoleModel },
      ],
    }).compile();

    seeder = module.get<RoleSeeder>(RoleSeeder);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(seeder).toBeDefined();
  });

  describe('seed', () => {
    it('should skip creation if role name profile is already registered', async () => {
      mockRoleModel.findOne.mockResolvedValue({ name: 'admin' });

      await seeder.seed();

      expect(mockRoleModel.findOne).toHaveBeenCalledTimes(2);
      expect(mockRoleModel.create).not.toHaveBeenCalled();
    });

    it('should create database entries for non-existent seed definitions', async () => {
      mockRoleModel.findOne.mockResolvedValue(null);
      mockRoleModel.create.mockResolvedValue({});

      await seeder.seed();

      expect(mockRoleModel.findOne).toHaveBeenCalledTimes(2);
      expect(mockRoleModel.create).toHaveBeenCalledTimes(2);
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service';
import { getModelToken } from '@nestjs/mongoose';
import { Role } from './schemas/role.schema';
import { mockMongooseModelFactory } from '../../test/mocks/mongoose-bull.mock';

describe('RolesService', () => {
  let service: RolesService;
  let mockRoleModel: any;

  beforeEach(async () => {
    mockRoleModel = mockMongooseModelFactory();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        {
          provide: getModelToken(Role.name),
          useValue: mockRoleModel,
        },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createRole', () => {
    it('should invoke model creation with specified name and permission options', async () => {
      const inputData = { name: 'manager', permissions: ['view-items'] };
      mockRoleModel.create.mockResolvedValue({ _id: 'role_id_111', ...inputData });

      const result = await service.createRole(inputData);

      expect(mockRoleModel.create).toHaveBeenCalledWith(inputData);
      expect(result).toHaveProperty('_id', 'role_id_111');
    });
  });

  describe('getRoles', () => {
    it('should find and return an array containing all system roles', async () => {
      const mockList = [{ name: 'admin' }, { name: 'customer' }];
      mockRoleModel.find.mockResolvedValue(mockList);

      const result = await service.getRoles();

      expect(mockRoleModel.find).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });

  describe('getRoleById', () => {
    it('should query specific record using identity parameters', async () => {
      const mockRole = { _id: 'role_id_abc', name: 'moderator' };
      mockRoleModel.findById.mockResolvedValue(mockRole);

      const result = await service.getRoleById('role_id_abc');

      expect(mockRoleModel.findById).toHaveBeenCalledWith('role_id_abc');
      expect(result).toEqual(mockRole);
    });
  });

  describe('getRoleByName', () => {
    it('should search for exact match criteria properties using findOne', async () => {
      const mockRole = { _id: 'role_id_xyz', name: 'guest' };
      mockRoleModel.findOne.mockResolvedValue(mockRole);

      const result = await service.getRoleByName('guest');

      expect(mockRoleModel.findOne).toHaveBeenCalledWith({ name: 'guest' });
      expect(result).toEqual(mockRole);
    });
  });

describe('updateRole', () => {
    it('should apply modification properties onto your documents and specify new returning context configuration option flags', async () => {
      const updateData = { permissions: ['read-only'] };
      mockRoleModel.findByIdAndUpdate.mockResolvedValue({ _id: 'id_1', name: 'user', ...updateData });

      const result = await service.updateRole('id_1', updateData);

      expect(mockRoleModel.findByIdAndUpdate).toHaveBeenCalledWith('id_1', updateData, { new: true });
      
      // Fixed with non-null assertion (!) to clear ts(18047)
      expect(result!.permissions).toContain('read-only');
    });
  });

  describe('deleteRole', () => {
    it('should clear specific items by referencing targets with findByIdAndDelete operations', async () => {
      mockRoleModel.findByIdAndDelete.mockResolvedValue({ _id: 'id_to_remove' });

      const result = await service.deleteRole('id_to_remove');

      expect(mockRoleModel.findByIdAndDelete).toHaveBeenCalledWith('id_to_remove');
      expect(result).toBeDefined();
    });
  });
});
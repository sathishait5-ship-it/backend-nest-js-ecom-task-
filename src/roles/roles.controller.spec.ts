import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';

describe('RolesController', () => {
  let controller: RolesController;
  let mockRolesService: Partial<RolesService>;

  beforeEach(async () => {
    mockRolesService = {
      createRole: jest.fn().mockResolvedValue({ _id: 'new_role_id', name: 'editor', permissions: [] }),
      getRoles: jest.fn().mockResolvedValue([{ _id: '1', name: 'admin' }, { _id: '2', name: 'customer' }]),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [
        {
          provide: RolesService,
          useValue: mockRolesService,
        },
      ],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createRole', () => {
    it('should direct body request parameters directly down onto the service initialization execution context layer', async () => {
      const bodyDto: CreateRoleDto = {
        name: 'editor',
        permissions: ['write-posts'],
      } as any; // Cast as any if DTO defines extra property checks

      const result = await controller.createRole(bodyDto);

      expect(mockRolesService.createRole).toHaveBeenCalledWith(bodyDto);
      expect(result).toHaveProperty('_id', 'new_role_id');
    });
  });

  describe('getRoles', () => {
    it('should aggregate list elements through a service retrieval callback sequence trigger', async () => {
      const result = await controller.getRoles();

      expect(mockRolesService.getRoles).toHaveBeenCalled();
      expect(result).toHaveLength(2);
    });
  });
});
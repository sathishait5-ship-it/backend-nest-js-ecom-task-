import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Role, RoleDocument } from './schemas/role.schema';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async createRole(data: { name: string; permissions: string[] }) {
    const exists = await this.roleModel.findOne({
      name: data.name,
    });

    if (exists) {
      throw new BadRequestException('Role already exists');
    }

    const role = await this.roleModel.create(data);

    return {
      success: true,
      message: 'Role created successfully',
      data: role,
    };
  }

  async getRoles() {
    const roles = await this.roleModel.find();

    return {
      success: true,
      message: 'Roles fetched successfully',
      data: roles,
    };
  }

  async getRoleById(roleId: string) {
    const role = await this.roleModel.findById(roleId);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      success: true,
      message: 'Role fetched successfully',
      data: role,
    };
  }

  async getRoleByName(name: string) {
    const role = await this.roleModel.findOne({
      name,
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      success: true,
      message: 'Role fetched successfully',
      data: role,
    };
  }

  async updateRole(
    roleId: string,
    updateData: {
      name?: string;
      permissions?: string[];
    },
  ) {
    const role = await this.roleModel.findByIdAndUpdate(roleId, updateData, {
      new: true,
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      success: true,
      message: 'Role updated successfully',
      data: role,
    };
  }

  async deleteRole(roleId: string) {
    const role = await this.roleModel.findByIdAndDelete(roleId);

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    return {
      success: true,
      message: 'Role deleted successfully',
      data: null,
    };
  }
}

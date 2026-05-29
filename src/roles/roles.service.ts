import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { Role, RoleDocument } from './schemas/role.schema';

@Injectable()
export class RolesService {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  // Create Role
  async createRole(data: { name: string; permissions: string[] }) {
    const role = await this.roleModel.create(data);

    return role;
  }

  // Get All Roles
  async getRoles() {
    return await this.roleModel.find();
  }

  // Get Role By ID
  async getRoleById(roleId: string) {
    return await this.roleModel.findById(roleId);
  }

  // Get Role By Name
  async getRoleByName(name: string) {
    return await this.roleModel.findOne({ name });
  }

  // Update Role
  async updateRole(
    roleId: string,
    updateData: {
      name?: string;
      permissions?: string[];
    },
  ) {
    return await this.roleModel.findByIdAndUpdate(roleId, updateData, {
      new: true,
    });
  }

  // Delete Role
  async deleteRole(roleId: string) {
    return await this.roleModel.findByIdAndDelete(roleId);
  }
}

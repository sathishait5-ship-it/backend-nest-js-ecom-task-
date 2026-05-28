import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import roles from '../seeds/roles.json';
import { Role, RoleDocument } from '../../roles/schemas/role.schema';

@Injectable()
export class RoleSeeder {
  constructor(
    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async seed() {
    for (const role of roles) {
      const exists = await this.roleModel.findOne({
        name: role.name,
      });

      if (exists) {
        console.log(`Role already exists: ${role.name}`);
        continue;
      }

      await this.roleModel.create(role);

      console.log(`Role created: ${role.name}`);
    }
  }
}

import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';

import users from '../seeds/users.json';

import { User, UserDocument } from '../../users/schemas/user.schema';
import { Role, RoleDocument } from '../../roles/schemas/role.schema';

@Injectable()
export class UserSeeder {
  constructor(
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,

    @InjectModel(Role.name)
    private readonly roleModel: Model<RoleDocument>,
  ) {}

  async seed() {
    /**
     * Check roles exist first
     */
    const roles = await this.roleModel.find();

    if (!roles.length) {
      console.log('No roles found. Please run role seeder first.');

      return;
    }

    console.log(`Found ${roles.length} roles`);

    for (const user of users) {
      const existingUser = await this.userModel.findOne({
        email: user.email,
      });

      if (existingUser) {
        console.log(`User already exists: ${user.email}`);

        continue;
      }

      if (!user.role || user.role.trim() === '') {
        console.log(`Role missing for user: ${user.email}`);

        continue;
      }

      const role = await this.roleModel.findOne({
        name: user.role,
      });

      if (!role) {
        console.log(`Invalid role '${user.role}' for user: ${user.email}`);

        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);

      await this.userModel.create({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: hashedPassword,
        phone: user.phone,
        address: user.address,
        role: role._id,
        isActive: true,
      });

      console.log(`User created: ${user.email}`);
    }

    /**
     * Only runs if seeding actually started
     */
    console.log('User seeding completed');
  }
}

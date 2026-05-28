import { BadRequestException, Injectable } from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { Model, UpdateQuery } from 'mongoose';

import { User, UserDocument } from './schemas/user.schema';

import { Role, RoleDocument } from '../roles/schemas/role.schema';

import { CreateUserDto } from './dto/create-user.dto';

import * as bcrypt from 'bcrypt';

import { UpdateUserDto } from './dto/update-user.dto';

import * as fs from 'fs';

import { join } from 'path';

import { MailService } from '../mail/mail.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    @InjectModel(Role.name)
    private roleModel: Model<RoleDocument>,

    private readonly mailService: MailService,
  ) {}

  async register(createUserDto: CreateUserDto, file: Express.Multer.File) {
    const existingUser = await this.userModel.findOne({
      email: createUserDto.email,
    });

    if (existingUser) {
      throw new BadRequestException('Email already exists');
    }

    let role: RoleDocument | null;

    // If roleId provided
    if (createUserDto.roleId) {
      role = await this.roleModel.findById(createUserDto.roleId);

      if (!role) {
        throw new BadRequestException('Invalid role');
      }
    } else {
      // Default customer role
      role = await this.roleModel.findOne({
        name: 'customer',
      });

      if (!role) {
        throw new BadRequestException('Customer role not found');
      }
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const image = file ? `/uploads/userImages/${file.filename}` : null;

    const userData = {
      firstName: createUserDto.firstName,

      lastName: createUserDto.lastName,

      email: createUserDto.email,

      password: hashedPassword,

      phone: createUserDto.phone,

      address: createUserDto.address,

      image,

      role: role._id,
    };

    const createdUser = await this.userModel.create(userData);

    // Send Welcome Mail
    try {
      await this.mailService.sendWelcomeMail(
        createdUser.email,
        `${createdUser.firstName} ${createdUser.lastName}`,
      );
    } catch (error) {
      console.error('Welcome email failed:', error);
    }

    return await this.userModel.findById(createdUser._id).populate('role');
  }

  async getUsers() {
    return await this.userModel.find().populate('role');
  }

  async getAllUserEssentials(): Promise<
    Array<{
      name: string;
      email: string;
      roleName: string | null;
      permissions: string[];
      image: string | null;
    }>
  > {
    return await this.userModel.aggregate([
      {
        $lookup: {
          from: 'roles',
          localField: 'role',
          foreignField: '_id',
          as: 'role',
        },
      },
      {
        $unwind: {
          path: '$role',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,

          name: {
            $trim: {
              input: {
                $concat: [
                  { $ifNull: ['$firstName', ''] },

                  ' ',

                  { $ifNull: ['$lastName', ''] },
                ],
              },
            },
          },

          email: 1,

          roleName: '$role.name',

          permissions: {
            $ifNull: ['$role.permissions', []],
          },

          image: 1,
        },
      },
    ]);
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    file?: Express.Multer.File,
  ) {
    const existingUser = await this.userModel.findById(userId);

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    const updateData: UpdateQuery<UserDocument> = {
      ...(updateUserDto as Partial<UserDocument>),
    } as UpdateQuery<UserDocument>;

    // If roleId provided
    if (updateUserDto.roleId) {
      const role = await this.roleModel.findById(updateUserDto.roleId);

      if (!role) {
        throw new BadRequestException('Invalid role');
      }

      updateData.role = role._id;

      delete updateData.roleId;
    }

    // Update image
    if (file) {
      // Delete old image
      if (existingUser.image) {
        const oldImagePath = join(
          process.cwd(),
          existingUser.image.replace(/^\/+/, ''),
        );

        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }

      updateData.image = `/uploads/userImages/${file.filename}`;
    }

    // Hash password if updated
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(userId, updateData, {
        new: true,
      })
      .populate('role');

    return updatedUser;
  }

  async deleteUser(userId: string) {
    const existingUser = await this.userModel.findById(userId);

    if (!existingUser) {
      throw new BadRequestException('User not found');
    }

    // Delete user image from folder
    if (existingUser.image) {
      const imagePath = join(
        process.cwd(),
        existingUser.image.replace(/^\/+/, ''),
      );

      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    await this.userModel.findByIdAndDelete(userId);

    return {
      message: 'User deleted successfully',
    };
  }
}

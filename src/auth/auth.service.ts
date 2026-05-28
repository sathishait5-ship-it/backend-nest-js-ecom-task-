import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { InjectModel } from '@nestjs/mongoose';

import { JwtService } from '@nestjs/jwt';

import { Model } from 'mongoose';

import * as bcrypt from 'bcrypt';

import { User, UserDocument } from '../users/schemas/user.schema';

import { RoleDocument } from '../roles/schemas/role.schema';

import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    private jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    const user = await this.userModel
      .findOne({
        email: loginDto.email,
      })
      .populate('role');

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordMatched = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new BadRequestException('User account is inactive');
    }

    try {
      if (user.currentToken && user.tokenExpiresAt) {
        // Token expired
        if (user.tokenExpiresAt < new Date()) {
          await this.userModel.findByIdAndUpdate(user._id, {
            currentToken: null,

            tokenExpiresAt: null,
          });

          throw new UnauthorizedException('Login expired. Please login again');
        }

        // Already logged in
        throw new UnauthorizedException(
          'An active session already exists. Please logout first or wait until the session expires',
        );
      }
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new UnauthorizedException('Authentication failed');
    }

    const payload = {
      sub: user._id,

      email: user.email,

      role: user.role,
    };

    const expiresIn = '1d';

    const accessToken = await this.jwtService.signAsync(payload, {
      expiresIn,
    });

    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.userModel.findByIdAndUpdate(user._id, {
      currentToken: accessToken,

      tokenExpiresAt,
    });

    const updatedUser = await this.userModel
      .findById(user._id)
      .populate('role');

    const populatedRole = updatedUser?.role as unknown as RoleDocument;

    return {
      message: 'Login successful',

      token: accessToken,

      tokenExpiresAt,

      user: {
        _id: updatedUser?._id,

        fullName: `${updatedUser?.firstName ?? ''} ${
          updatedUser?.lastName ?? ''
        }`.trim(),

        image: updatedUser?.image ?? null,

        ...(populatedRole && populatedRole.name !== 'customer'
          ? {
              role: {
                name: populatedRole.name,

                permissions: populatedRole.permissions ?? [],
              },
            }
          : {}),
      },
    };
  }

  async logout(userId: string) {
    await this.userModel.findByIdAndUpdate(userId, {
      currentToken: null,

      tokenExpiresAt: null,
    });

    return {
      message: 'Logout successful',
    };
  }
}

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

    if (user.currentToken && user.tokenExpiresAt) {
      if (user.tokenExpiresAt < new Date()) {
        await this.userModel.findByIdAndUpdate(user._id, {
          currentToken: null,
          tokenExpiresAt: null,
        });

        throw new UnauthorizedException('Login expired. Please login again');
      }

      throw new UnauthorizedException(
        'An active session already exists. Please logout first or wait until the session expires',
      );
    }

    const role = user.role as unknown as RoleDocument;

    const payload = {
      sub: user._id,
      email: user.email,
      role: {
        _id: role._id,
        name: role.name,
        permissions: role.permissions,
      },
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

    return {
      message: 'Login successful',

      token: accessToken,

      tokenExpiresAt,

      user: {
        _id: user._id,

        fullName: `${user.firstName} ${user.lastName}`,

        image: user.image ?? null,

        role: {
          _id: role._id,
          name: role.name,
          permissions: role.permissions ?? [],
        },
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

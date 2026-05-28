import { Injectable, UnauthorizedException } from '@nestjs/common';

import { PassportStrategy } from '@nestjs/passport';

import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '@nestjs/config';

import { InjectModel } from '@nestjs/mongoose';

import { Model } from 'mongoose';

import { User, UserDocument } from '../../users/schemas/user.schema';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<UserDocument>,

    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey:
        configService.get<string>('JWT_SECRET') ?? 'defaultSecretKey',
    });
  }

  async validate(payload: { sub: string; email: string }) {
    const user = await this.userModel.findById(payload.sub).populate('role');

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.currentToken) {
      throw new UnauthorizedException('Session expired. Please login again');
    }

    if (user.tokenExpiresAt && user.tokenExpiresAt < new Date()) {
      await this.userModel.findByIdAndUpdate(user._id, {
        currentToken: null,

        tokenExpiresAt: null,
      });

      throw new UnauthorizedException('Login expired. Please login again');
    }

    return user;
  }
}

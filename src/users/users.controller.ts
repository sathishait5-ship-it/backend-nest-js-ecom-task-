import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import type { Request } from 'express';

import { FileInterceptor } from '@nestjs/platform-express';

import { diskStorage } from 'multer';

import { extname } from 'path';

import { UsersService } from './users.service';

import { CreateUserDto } from './dto/create-user.dto';

import { UpdateUserDto } from './dto/update-user.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../common/guards/permissions.guard';
import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('register')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/userImages',

        filename: (req, file, callback) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);

          callback(null, `${uniqueName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async register(
    @Body() createUserDto: CreateUserDto,

    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.register(createUserDto, file);
  }

  @UseGuards(JwtAuthGuard)
  @Permissions('view-users')
  @Get()
  async getUsers() {
    return this.usersService.getUsers();
  }

  // 1. Move static routes ABOVE dynamic parameter routes
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('view-users')
  @Get('getAllUserEssentials')
  async getAllUserEssentials() {
    return this.usersService.getAllUserEssentials();
  }

  // 2. Dynamic parameter routes go at the bottom
  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/userImages',
        filename: (req, file, callback) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);
          callback(null, `${uniqueName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.usersService.updateUser(id, updateUserDto, file);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(@Param('id') id: string) {
    return this.usersService.deleteUser(id);
  }
}

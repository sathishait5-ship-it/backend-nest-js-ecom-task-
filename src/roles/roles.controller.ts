import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { RolesService } from './roles.service';

import { CreateRoleDto } from './dto/create-role.dto';

import { UpdateRoleDto } from './dto/update-role.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { PermissionsGuard } from '../common/guards/permissions.guard';

import { Permissions } from '../common/decorators/permissions.decorator';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  /**
   * CREATE ROLE
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('manage_roles')
  @Post()
  async createRole(
    @Body()
    body: CreateRoleDto,
  ) {
    return this.rolesService.createRole(body);
  }

  /**
   * GET ROLES
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('manage_roles')
  @Get()
  async getRoles() {
    return this.rolesService.getRoles();
  }

  /**
   * UPDATE ROLE
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('manage_roles')
  @Patch(':id')
  async updateRole(
    @Param('id')
    id: string,

    @Body()
    body: UpdateRoleDto,
  ) {
    return this.rolesService.updateRole(id, body);
  }

  /**
   * DELETE ROLE
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('manage_roles')
  @Delete(':id')
  async deleteRole(
    @Param('id')
    id: string,
  ) {
    return this.rolesService.deleteRole(id);
  }
}

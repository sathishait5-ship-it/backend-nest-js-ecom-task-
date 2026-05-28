import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}
  @UseGuards(JwtAuthGuard)
  @Post()
  async createRole(@Body() body: CreateRoleDto) {
    return this.rolesService.createRole(body);
  }
  @UseGuards(JwtAuthGuard)
  @Get()
  async getRoles() {
    return this.rolesService.getRoles();
  }
  @Post('seed')
  async seedRoles() {
    return this.rolesService.seedRoles();
  }
}

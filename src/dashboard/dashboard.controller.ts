import { Controller, Get, UseGuards } from '@nestjs/common';

import { DashboardService } from './dashboard.service';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }
}

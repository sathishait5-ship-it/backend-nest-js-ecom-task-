import { Body, Controller, Param, Post, Req, UseGuards } from '@nestjs/common';

import type { Request } from 'express';

import { ReviewsService } from './reviews.service';

import { CreateReviewDto } from './dto/create-review.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { Permissions } from '../common/decorators/permissions.decorator';
import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';

@Controller('products/:productId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Param('productId') productId: string,

    @Body() createReviewDto: CreateReviewDto,

    @Req() req: RequestWithUser,
  ) {
    return this.reviewsService.createReview(
      productId,
      createReviewDto,
      req.user,
    );
  }
}

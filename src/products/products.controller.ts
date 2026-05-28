import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import type { RequestWithUser } from '../common/interfaces/request-with-user.interface';

import { FilesInterceptor } from '@nestjs/platform-express';

import { diskStorage } from 'multer';

import { extname } from 'path';

import { ProductsService } from './products.service';

import { CreateProductDto } from './dto/create-product.dto';

import { UpdateProductDto } from './dto/update-product.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

import { PermissionsGuard } from '../common/guards/permissions.guard';

import { Permissions } from '../common/decorators/permissions.decorator';

import { PaginationQueryDto } from '../common/pagination/dto/pagination-query.dto';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Create Product
   */
  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('create-product')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: './uploads/productImages',

        filename: (req, file, callback) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);

          callback(null, `${uniqueName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async createProduct(
    @Body() createProductDto: CreateProductDto,

    @UploadedFiles()
    files: Express.Multer.File[],

    @Req() req: RequestWithUser,
  ) {
    return this.productsService.createProduct(
      createProductDto,
      files,
      req.user,
    );
  }

  /**
   * Get All Products
   */
  @Get()
  @SkipThrottle()
  async getAllProducts(@Query() query: PaginationQueryDto) {
    return this.productsService.getAllProducts(query);
  }

  /**
   * Get Product By ID
   */
  @Get(':id')
  async getProductById(@Param('id') id: string) {
    return this.productsService.getProductById(id);
  }

  /**
   * Update Product
   */
  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('update-product')
  @UseInterceptors(
    FilesInterceptor('images', 10, {
      storage: diskStorage({
        destination: './uploads/productImages',

        filename: (req, file, callback) => {
          const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e9);

          callback(null, `${uniqueName}${extname(file.originalname)}`);
        },
      }),
    }),
  )
  async updateProduct(
    @Param('id') id: string,

    @Body()
    updateProductDto: UpdateProductDto,

    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    return this.productsService.updateProduct(id, updateProductDto, files);
  }

  /**
   * Delete Product
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('delete-product')
  async deleteProduct(@Param('id') id: string) {
    return this.productsService.deleteProduct(id);
  }
}

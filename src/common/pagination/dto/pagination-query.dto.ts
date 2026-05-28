import {
  IsBooleanString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

import { Type } from 'class-transformer';

export class PaginationQueryDto {
  /**
   * Pagination
   */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 10;

  /**
   * Search
   */
  @IsString()
  @IsOptional()
  search?: string;

  /**
   * Sorting
   */
  @IsString()
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsIn(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'desc';

  /**
   * Date Filters
   */
  @IsOptional()
  startDate?: string;

  @IsOptional()
  endDate?: string;

  @IsOptional()
  specificDate?: string;

  /**
   * Stock Filter
   */
  @IsBooleanString()
  @IsOptional()
  inStock?: string;

  /**
   * Price Range Filters
   */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  minPrice?: number;

  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  maxPrice?: number;

  /**
   * Discount Filter
   */
  @IsBooleanString()
  @IsOptional()
  hasDiscount?: string;

  /**
   * Rating Filter
   */
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  minRating?: number;

  /**
   * Latest Products
   */
  @IsBooleanString()
  @IsOptional()
  latest?: string;
}

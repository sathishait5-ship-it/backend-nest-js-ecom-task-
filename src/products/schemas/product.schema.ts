import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import mongoose, { Document, Types } from 'mongoose';

export type ProductDocument = Product & Document;

@Schema({ timestamps: true })
export class Product {
  @Prop({
    required: true,
    trim: true,
  })
  name!: string;

  @Prop({
    required: true,
    trim: true,
  })
  description!: string;

  @Prop({
    required: true,
    min: 0,
  })
  price!: number;

  @Prop({
    default: 0,
    min: 0,
  })
  discountPrice!: number;

  @Prop({
    required: true,
    min: 0,
    default: 0,
  })
  stock!: number;

  @Prop({
    required: true,
    trim: true,
  })
  category!: string;

  @Prop({
    trim: true,
    default: '',
  })
  brand!: string;

  @Prop({
    type: [String],
    default: [],
  })
  images!: string[];

  @Prop({
    default: true,
  })
  isActive!: boolean;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  createdBy!: Types.ObjectId;
}

export const ProductSchema = SchemaFactory.createForClass(Product);

/**
 * Indexes
 */
ProductSchema.index({ name: 'text' });

ProductSchema.index({ category: 1 });

ProductSchema.index({ createdAt: -1 });

ProductSchema.index({ stock: 1 });

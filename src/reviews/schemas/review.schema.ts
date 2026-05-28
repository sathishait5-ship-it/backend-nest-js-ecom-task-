import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import mongoose, { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({
    required: true,
    min: 1,
    max: 5,
  })
  rating!: number;

  @Prop({
    trim: true,
    default: '',
  })
  comment!: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  })
  productId!: Types.ObjectId;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

/**
 * Indexes
 */
ReviewSchema.index({ productId: 1 });

ReviewSchema.index({ userId: 1 });

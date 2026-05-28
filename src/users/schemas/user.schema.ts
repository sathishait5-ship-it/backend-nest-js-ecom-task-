import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

import mongoose, { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  firstName!: string;

  @Prop({ required: true })
  lastName!: string;

  @Prop({ required: true, unique: true })
  email!: string;

  @Prop({ required: true })
  password!: string;

  @Prop()
  phone!: string;

  @Prop()
  address!: string;

  @Prop({
    type: String,
    default: null,
  })
  image!: string | null;

  @Prop({ default: true })
  isActive!: boolean;

  @Prop({
    type: String,
    default: null,
  })
  currentToken!: string | null;

  @Prop({
    type: Date,
    default: null,
  })
  tokenExpiresAt!: Date | null;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true,
  })
  role!: Types.ObjectId;
}

export const UserSchema = SchemaFactory.createForClass(User);

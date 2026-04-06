import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ExpenseDocument = Expense & Document;

export enum ExpenseStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  FAILED = 'failed',
}

@Schema({ timestamps: true, collection: 'expenses' })
export class Expense {
  @Prop({ required: true, trim: true })
  filename: string;

  @Prop({ required: true })
  originalName: string;

  @Prop({ required: true })
  filePath: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ enum: ExpenseStatus, default: ExpenseStatus.PENDING })
  status: ExpenseStatus;

  @Prop({ type: Number, default: 0 })
  totalAmount: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ type: String, default: null })
  errorMessage: string | null;

  @Prop({ type: Number, default: 0 })
  transactionCount: number;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(Expense);
ExpenseSchema.index({ userId: 1, createdAt: -1 });

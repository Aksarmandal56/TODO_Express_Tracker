import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type TransactionDocument = Transaction & Document;

export enum TransactionType {
  DEBIT = 'debit',
  CREDIT = 'credit',
}

@Schema({ timestamps: true, collection: 'transactions' })
export class Transaction {
  @Prop({ type: Types.ObjectId, ref: 'Expense', required: true })
  expenseId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true, type: Number })
  amount: number;

  @Prop({ type: String, default: 'USD' })
  currency: string;

  @Prop({ enum: TransactionType, default: TransactionType.DEBIT })
  type: TransactionType;

  @Prop({ type: Date, default: null })
  date: Date | null;

  @Prop({ type: String, default: 'Other' })
  category: string;

  @Prop({ type: String, default: null })
  merchant: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TransactionSchema = SchemaFactory.createForClass(Transaction);
TransactionSchema.index({ expenseId: 1 });
TransactionSchema.index({ userId: 1, date: -1 });
TransactionSchema.index({ userId: 1, category: 1 });

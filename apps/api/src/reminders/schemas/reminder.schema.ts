import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReminderDocument = Reminder & Document;

export enum RecurrenceType {
  NONE = 'none',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly',
}

@Schema({ timestamps: true, collection: 'reminders' })
export class Reminder {
  @Prop({ required: true, trim: true, maxlength: 500 })
  title: string;

  @Prop({ trim: true, maxlength: 2000, default: '' })
  description: string;

  @Prop({ required: true, type: Date })
  datetime: Date;

  @Prop({ enum: RecurrenceType, default: RecurrenceType.NONE })
  recurrence: RecurrenceType;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ default: false })
  notified: boolean;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ type: Date, default: null })
  nextOccurrence: Date | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ReminderSchema = SchemaFactory.createForClass(Reminder);
ReminderSchema.index({ userId: 1, datetime: 1 });
ReminderSchema.index({ datetime: 1, notified: 1, isActive: 1 });

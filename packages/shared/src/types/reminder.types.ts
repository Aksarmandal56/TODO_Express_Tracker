export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export interface Reminder {
  _id: string;
  title: string;
  description?: string;
  datetime: Date | string;
  recurrence: RecurrenceType;
  userId: string;
  notified: boolean;
  isActive: boolean;
  nextOccurrence?: Date | string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CreateReminderPayload {
  title: string;
  description?: string;
  datetime: string;
  recurrence?: RecurrenceType;
}

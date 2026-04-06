import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cron, CronExpression } from '@nestjs/schedule';
import * as dayjs from 'dayjs';
import { Reminder, ReminderDocument, RecurrenceType } from './schemas/reminder.schema';
import { CreateReminderDto } from './dto/create-reminder.dto';

@Injectable()
export class RemindersService {
  private readonly logger = new Logger(RemindersService.name);

  constructor(
    @InjectModel(Reminder.name) private readonly reminderModel: Model<ReminderDocument>,
  ) {}

  async create(userId: string, dto: CreateReminderDto): Promise<ReminderDocument> {
    return this.reminderModel.create({
      ...dto,
      datetime: new Date(dto.datetime),
      userId: new Types.ObjectId(userId),
    });
  }

  async findAll(userId: string): Promise<ReminderDocument[]> {
    return this.reminderModel
      .find({ userId: new Types.ObjectId(userId), isActive: true })
      .sort({ datetime: 1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<ReminderDocument> {
    const reminder = await this.reminderModel.findById(id).exec();
    if (!reminder) throw new NotFoundException('Reminder not found');
    if (reminder.userId.toString() !== userId) throw new ForbiddenException('Access denied');
    return reminder;
  }

  async update(userId: string, id: string, dto: Partial<CreateReminderDto>): Promise<ReminderDocument> {
    const reminder = await this.findOne(userId, id);
    if (dto.datetime) reminder.datetime = new Date(dto.datetime);
    Object.assign(reminder, { ...dto, datetime: reminder.datetime });
    reminder.notified = false;
    return reminder.save();
  }

  async remove(userId: string, id: string): Promise<void> {
    const reminder = await this.findOne(userId, id);
    await reminder.deleteOne();
  }

  async getUpcoming(userId: string, days = 7): Promise<ReminderDocument[]> {
    const from = new Date();
    const to = dayjs().add(days, 'day').toDate();
    return this.reminderModel
      .find({
        userId: new Types.ObjectId(userId),
        datetime: { $gte: from, $lte: to },
        isActive: true,
      })
      .sort({ datetime: 1 })
      .exec();
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async processReminders(): Promise<void> {
    const now = new Date();
    const oneMinuteLater = dayjs(now).add(1, 'minute').toDate();

    const dueReminders = await this.reminderModel.find({
      datetime: { $lte: oneMinuteLater },
      notified: false,
      isActive: true,
    }).exec();

    for (const reminder of dueReminders) {
      try {
        // In production, send push notification / email here
        this.logger.log(`Reminder due: "${reminder.title}" for user ${reminder.userId}`);
        reminder.notified = true;

        if (reminder.recurrence !== RecurrenceType.NONE) {
          reminder.notified = false;
          reminder.datetime = this.calculateNextOccurrence(reminder.datetime, reminder.recurrence);
        }

        await reminder.save();
      } catch (err) {
        this.logger.error(`Failed to process reminder ${reminder._id}:`, err);
      }
    }
  }

  private calculateNextOccurrence(current: Date, recurrence: RecurrenceType): Date {
    const d = dayjs(current);
    switch (recurrence) {
      case RecurrenceType.DAILY:   return d.add(1, 'day').toDate();
      case RecurrenceType.WEEKLY:  return d.add(1, 'week').toDate();
      case RecurrenceType.MONTHLY: return d.add(1, 'month').toDate();
      case RecurrenceType.YEARLY:  return d.add(1, 'year').toDate();
      default:                     return current;
    }
  }
}

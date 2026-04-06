import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Task, TaskDocument, TaskStatus } from './schemas/task.schema';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectModel(Task.name) private readonly taskModel: Model<TaskDocument>,
  ) {}

  async create(userId: string, dto: CreateTaskDto): Promise<TaskDocument> {
    return this.taskModel.create({ ...dto, userId: new Types.ObjectId(userId) });
  }

  async findAll(
    userId: string,
    filters: {
      status?: TaskStatus;
      search?: string;
      tags?: string[];
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{ tasks: TaskDocument[]; total: number; page: number; totalPages: number }> {
    const { status, search, tags, page = 1, limit = 20 } = filters;
    const query: Record<string, any> = { userId: new Types.ObjectId(userId), archived: { $ne: true } };

    if (status) query.status = status;
    if (tags?.length) query.tags = { $in: tags };
    if (search) query.$text = { $search: search };

    const skip = (page - 1) * limit;
    const [tasks, total] = await Promise.all([
      this.taskModel.find(query).sort({ position: 1, createdAt: -1 }).skip(skip).limit(limit).exec(),
      this.taskModel.countDocuments(query),
    ]);

    return { tasks, total, page, totalPages: Math.ceil(total / limit) };
  }

  async findOne(userId: string, taskId: string): Promise<TaskDocument> {
    const task = await this.taskModel.findById(taskId).exec();
    if (!task) throw new NotFoundException('Task not found');
    if (task.userId.toString() !== userId) throw new ForbiddenException('Access denied');
    return task;
  }

  async update(userId: string, taskId: string, dto: UpdateTaskDto): Promise<TaskDocument> {
    const task = await this.findOne(userId, taskId);
    Object.assign(task, dto);
    return task.save();
  }

  async remove(userId: string, taskId: string): Promise<void> {
    const task = await this.findOne(userId, taskId);
    await task.deleteOne();
  }

  async getKanbanBoard(userId: string): Promise<Record<TaskStatus, TaskDocument[]>> {
    const tasks = await this.taskModel
      .find({ userId: new Types.ObjectId(userId), archived: { $ne: true } })
      .sort({ position: 1 })
      .exec();

    const board: Record<TaskStatus, TaskDocument[]> = {
      [TaskStatus.TODO]: [],
      [TaskStatus.IN_PROGRESS]: [],
      [TaskStatus.IN_REVIEW]: [],
      [TaskStatus.DONE]: [],
    };

    tasks.forEach((task) => board[task.status].push(task));
    return board;
  }

  async getStats(userId: string) {
    const stats = await this.taskModel.aggregate([
      { $match: { userId: new Types.ObjectId(userId), archived: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);
    return stats.reduce((acc: Record<string, number>, s: { _id: string; count: number }) => {
      acc[s._id] = s.count;
      return acc;
    }, {});
  }
}

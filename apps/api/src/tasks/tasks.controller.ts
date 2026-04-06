import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { TasksGateway } from './tasks.gateway';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { TaskStatus } from './schemas/task.schema';

@ApiTags('tasks')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('tasks')
export class TasksController {
  constructor(
    private readonly tasksService: TasksService,
    private readonly tasksGateway: TasksGateway,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateTaskDto) {
    const task = await this.tasksService.create(user.userId, dto);
    this.tasksGateway.emitTaskCreated(user.userId, task);
    return task;
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with optional filters' })
  @ApiQuery({ name: 'status', enum: TaskStatus, required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Query('status') status?: TaskStatus,
    @Query('search') search?: string,
    @Query('tags') tags?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.tasksService.findAll(user.userId, {
      status,
      search,
      tags: tags ? tags.split(',') : undefined,
      page,
      limit,
    });
  }

  @Get('board')
  @ApiOperation({ summary: 'Get kanban board grouped by status' })
  async getBoard(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.getKanbanBoard(user.userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get task statistics' })
  async getStats(@CurrentUser() user: AuthenticatedUser) {
    return this.tasksService.getStats(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a task by ID' })
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.tasksService.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a task' })
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const task = await this.tasksService.update(user.userId, id, dto);
    this.tasksGateway.emitTaskUpdated(user.userId, task);
    return task;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a task' })
  async remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.tasksService.remove(user.userId, id);
    this.tasksGateway.emitTaskDeleted(user.userId, id);
  }
}

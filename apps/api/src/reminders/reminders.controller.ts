import {
  Controller,
  Get,
  Post,
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
import { RemindersService } from './reminders.service';
import { CreateReminderDto } from './dto/create-reminder.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('reminders')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a reminder' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateReminderDto) {
    return this.remindersService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all reminders' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.remindersService.findAll(user.userId);
  }

  @Get('upcoming')
  @ApiOperation({ summary: 'Get upcoming reminders' })
  @ApiQuery({ name: 'days', required: false, type: Number })
  getUpcoming(@CurrentUser() user: AuthenticatedUser, @Query('days') days?: number) {
    return this.remindersService.getUpcoming(user.userId, days);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a reminder by ID' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.remindersService.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reminder' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateReminderDto>,
  ) {
    return this.remindersService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a reminder' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.remindersService.remove(user.userId, id);
  }
}

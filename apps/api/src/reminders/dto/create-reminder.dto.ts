import { IsString, IsOptional, IsEnum, IsDateString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecurrenceType } from '../schemas/reminder.schema';

export class CreateReminderDto {
  @ApiProperty({ example: 'Team standup meeting' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ example: 'Daily team sync at 9am' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiProperty({ example: '2024-12-31T09:00:00Z' })
  @IsDateString()
  datetime: string;

  @ApiPropertyOptional({ enum: RecurrenceType, default: RecurrenceType.NONE })
  @IsEnum(RecurrenceType)
  @IsOptional()
  recurrence?: RecurrenceType;
}

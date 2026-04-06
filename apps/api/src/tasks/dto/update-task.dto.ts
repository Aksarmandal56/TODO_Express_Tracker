import { PartialType } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
  @ApiPropertyOptional({ description: 'Position in the kanban column', example: 2 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  position?: number;

  @ApiPropertyOptional({ description: 'Archive the task' })
  @IsOptional()
  archived?: boolean;
}

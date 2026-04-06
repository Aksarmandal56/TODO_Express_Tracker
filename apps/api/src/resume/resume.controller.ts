import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ResumeService } from './resume.service';

class EnhanceResumeDto {
  @ApiPropertyOptional({ example: 'Senior Software Engineer', maxLength: 200 })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  @Matches(/^[a-zA-Z0-9 \-_.,+#]*$/, { message: 'targetRole contains invalid characters' })
  targetRole?: string;
}
import { CreateResumeDto } from './dto/create-resume.dto';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('resume')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('resume')
export class ResumeController {
  constructor(private readonly resumeService: ResumeService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new resume' })
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateResumeDto) {
    return this.resumeService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all resumes' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.resumeService.findAll(user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a resume by ID' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resumeService.findOne(user.userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a resume' })
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: Partial<CreateResumeDto>,
  ) {
    return this.resumeService.update(user.userId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a resume' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.resumeService.remove(user.userId, id);
  }

  @Post(':id/enhance')
  @ApiOperation({ summary: 'Enhance resume with AI (Claude)' })
  enhance(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: EnhanceResumeDto,
  ) {
    return this.resumeService.enhanceWithAI(user.userId, id, dto.targetRole);
  }

  @Post(':id/cover-letter')
  @ApiOperation({ summary: 'Generate cover letter with AI' })
  generateCoverLetter(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { targetCompany: string; targetRole: string },
  ) {
    return this.resumeService.generateCoverLetter(
      user.userId,
      id,
      body.targetCompany,
      body.targetRole,
    );
  }
}

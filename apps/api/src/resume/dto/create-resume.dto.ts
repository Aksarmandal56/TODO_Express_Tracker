import {
  IsString,
  IsOptional,
  IsEmail,
  IsUrl,
  IsArray,
  ValidateNested,
  IsBoolean,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PersonalInfoDto {
  @ApiProperty() @IsString() @MinLength(2) fullName: string;
  @ApiProperty() @IsEmail() email: string;
  @ApiPropertyOptional() @IsString() @IsOptional() phone?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() location?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() linkedin?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() github?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() website?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() @MaxLength(2000) summary?: string;
}

export class EducationDto {
  @ApiProperty() @IsString() institution: string;
  @ApiProperty() @IsString() degree: string;
  @ApiPropertyOptional() @IsString() @IsOptional() fieldOfStudy?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() endDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() gpa?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
}

export class ExperienceDto {
  @ApiProperty() @IsString() company: string;
  @ApiProperty() @IsString() position: string;
  @ApiPropertyOptional() @IsString() @IsOptional() location?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() endDate?: string;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() current?: boolean;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() responsibilities?: string[];
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() achievements?: string[];
}

export class ProjectDto {
  @ApiProperty() @IsString() name: string;
  @ApiPropertyOptional() @IsString() @IsOptional() description?: string;
  @ApiPropertyOptional({ type: [String] }) @IsArray() @IsOptional() technologies?: string[];
  @ApiPropertyOptional() @IsString() @IsOptional() url?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() githubUrl?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() startDate?: string;
  @ApiPropertyOptional() @IsString() @IsOptional() endDate?: string;
}

export class SkillDto {
  @ApiProperty() @IsString() category: string;
  @ApiProperty({ type: [String] }) @IsArray() items: string[];
}

export class CreateResumeDto {
  @ApiProperty({ example: 'Software Engineer Resume 2024' })
  @IsString()
  @MinLength(2)
  title: string;

  @ApiProperty({ type: PersonalInfoDto })
  @ValidateNested()
  @Type(() => PersonalInfoDto)
  personalInfo: PersonalInfoDto;

  @ApiPropertyOptional({ type: [EducationDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education?: EducationDto[];

  @ApiPropertyOptional({ type: [ExperienceDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experience?: ExperienceDto[];

  @ApiPropertyOptional({ type: [ProjectDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => ProjectDto)
  projects?: ProjectDto[];

  @ApiPropertyOptional({ type: [SkillDto] })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills?: SkillDto[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  certifications?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsArray()
  @IsOptional()
  languages?: string[];
}

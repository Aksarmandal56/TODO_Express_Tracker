import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Resume, ResumeDocument } from './schemas/resume.schema';
import { CreateResumeDto } from './dto/create-resume.dto';
import { AiService } from './ai.service';

@Injectable()
export class ResumeService {
  constructor(
    @InjectModel(Resume.name) private readonly resumeModel: Model<ResumeDocument>,
    private readonly aiService: AiService,
  ) {}

  async create(userId: string, dto: CreateResumeDto): Promise<ResumeDocument> {
    return this.resumeModel.create({
      ...dto,
      userId: new Types.ObjectId(userId),
    });
  }

  async findAll(userId: string): Promise<ResumeDocument[]> {
    return this.resumeModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<ResumeDocument> {
    const resume = await this.resumeModel.findById(id).exec();
    if (!resume) throw new NotFoundException('Resume not found');
    if (resume.userId.toString() !== userId) throw new ForbiddenException('Access denied');
    return resume;
  }

  async update(userId: string, id: string, dto: Partial<CreateResumeDto>): Promise<ResumeDocument> {
    const resume = await this.findOne(userId, id);
    Object.assign(resume, dto);
    return resume.save();
  }

  async remove(userId: string, id: string): Promise<void> {
    const resume = await this.findOne(userId, id);
    await resume.deleteOne();
  }

  async enhanceWithAI(
    userId: string,
    id: string,
    targetRole?: string,
  ) {
    const resume = await this.findOne(userId, id);

    const enhancement = await this.aiService.enhanceResume({
      personalInfo: {
        name: resume.personalInfo.fullName,
        email: resume.personalInfo.email,
        summary: resume.personalInfo.summary,
      },
      experience: resume.experience.map((e) => ({
        company: e.company,
        position: e.position,
        responsibilities: e.responsibilities,
      })),
      skills: resume.skills,
      targetRole,
    });

    return { resume, enhancement };
  }

  async generateCoverLetter(userId: string, id: string, targetCompany: string, targetRole: string) {
    const resume = await this.findOne(userId, id);

    const allSkills = resume.skills.flatMap((s) => s.items).slice(0, 10);
    const experienceSummary = resume.experience
      .slice(0, 2)
      .map((e) => `${e.position} at ${e.company}`)
      .join(', ');

    return this.aiService.generateCoverLetter({
      resumeTitle: resume.title,
      applicantName: resume.personalInfo.fullName,
      targetCompany,
      targetRole,
      keySkills: allSkills,
      experience: experienceSummary,
    });
  }
}

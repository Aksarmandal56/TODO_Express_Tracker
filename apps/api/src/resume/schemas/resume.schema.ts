import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ResumeDocument = Resume & Document;

@Schema({ _id: false })
class PersonalInfo {
  @Prop({ required: true }) fullName: string;
  @Prop({ required: true }) email: string;
  @Prop() phone: string;
  @Prop() location: string;
  @Prop() linkedin: string;
  @Prop() github: string;
  @Prop() website: string;
  @Prop({ maxlength: 2000 }) summary: string;
}

@Schema({ _id: false })
class Education {
  @Prop({ required: true }) institution: string;
  @Prop({ required: true }) degree: string;
  @Prop() fieldOfStudy: string;
  @Prop() startDate: string;
  @Prop() endDate: string;
  @Prop() gpa: string;
  @Prop() description: string;
}

@Schema({ _id: false })
class Experience {
  @Prop({ required: true }) company: string;
  @Prop({ required: true }) position: string;
  @Prop() location: string;
  @Prop() startDate: string;
  @Prop() endDate: string;
  @Prop() current: boolean;
  @Prop({ type: [String] }) responsibilities: string[];
  @Prop({ type: [String] }) achievements: string[];
}

@Schema({ _id: false })
class Project {
  @Prop({ required: true }) name: string;
  @Prop() description: string;
  @Prop({ type: [String] }) technologies: string[];
  @Prop() url: string;
  @Prop() githubUrl: string;
  @Prop() startDate: string;
  @Prop() endDate: string;
}

@Schema({ _id: false })
class Skill {
  @Prop({ required: true }) category: string;
  @Prop({ type: [String], required: true }) items: string[];
}

@Schema({ timestamps: true, collection: 'resumes' })
export class Resume {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true, trim: true })
  title: string;

  @Prop({ type: PersonalInfo, required: true })
  personalInfo: PersonalInfo;

  @Prop({ type: [Education], default: [] })
  education: Education[];

  @Prop({ type: [Experience], default: [] })
  experience: Experience[];

  @Prop({ type: [Project], default: [] })
  projects: Project[];

  @Prop({ type: [Skill], default: [] })
  skills: Skill[];

  @Prop({ type: [String], default: [] })
  certifications: string[];

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop({ default: false })
  isPublic: boolean;

  @Prop({ type: String, default: null })
  generatedPdfPath: string | null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ResumeSchema = SchemaFactory.createForClass(Resume);
ResumeSchema.index({ userId: 1, createdAt: -1 });

export interface PersonalInfo {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  summary?: string;
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string;
  endDate?: string;
  gpa?: string;
  description?: string;
}

export interface Experience {
  company: string;
  position: string;
  location?: string;
  startDate?: string;
  endDate?: string;
  current?: boolean;
  responsibilities?: string[];
  achievements?: string[];
}

export interface Project {
  name: string;
  description?: string;
  technologies?: string[];
  url?: string;
  githubUrl?: string;
  startDate?: string;
  endDate?: string;
}

export interface Skill {
  category: string;
  items: string[];
}

export interface Resume {
  _id: string;
  userId: string;
  title: string;
  personalInfo: PersonalInfo;
  education: Education[];
  experience: Experience[];
  projects: Project[];
  skills: Skill[];
  certifications: string[];
  languages: string[];
  isPublic: boolean;
  generatedPdfPath?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface AIResumeEnhancement {
  enhancedSummary: string;
  improvedBullets: string[];
  suggestedSkills: string[];
  atsScore: number;
  suggestions: string[];
}

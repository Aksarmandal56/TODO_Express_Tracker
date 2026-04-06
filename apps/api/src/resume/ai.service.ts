import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';

export interface AIResumeEnhancement {
  enhancedSummary: string;
  improvedBullets: string[];
  suggestedSkills: string[];
  atsScore: number;
  suggestions: string[];
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private anthropicClient: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('ai.anthropicApiKey');
    if (apiKey) {
      this.anthropicClient = new Anthropic({ apiKey });
    } else {
      this.logger.warn('Anthropic API key not configured - AI features disabled');
    }
  }

  async enhanceResume(resumeData: {
    personalInfo: { name: string; email: string; summary?: string };
    experience: Array<{ company: string; position: string; responsibilities?: string[] }>;
    skills: Array<{ category: string; items: string[] }>;
    targetRole?: string;
  }): Promise<AIResumeEnhancement> {
    if (!this.anthropicClient) {
      return this.getMockEnhancement(resumeData.personalInfo.summary);
    }

    const prompt = `You are an expert resume writer and ATS optimization specialist.

Analyze the following resume and provide enhancements:

Name: ${resumeData.personalInfo.name}
Target Role: ${resumeData.targetRole || 'Software Engineer'}
Current Summary: ${resumeData.personalInfo.summary || 'None'}
Experience: ${JSON.stringify(resumeData.experience, null, 2)}
Skills: ${JSON.stringify(resumeData.skills, null, 2)}

Provide a JSON response with:
1. enhancedSummary: A compelling 3-4 sentence professional summary
2. improvedBullets: 5 strong action-oriented bullet points for experience
3. suggestedSkills: 10 relevant technical skills to add
4. atsScore: ATS compatibility score (0-100)
5. suggestions: 5 specific improvement suggestions

Respond only with valid JSON.`;

    try {
      const message = await this.anthropicClient.messages.create({
        model: 'claude-3-haiku-20240307',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }],
      });

      const content = message.content[0];
      if (content.type !== 'text') throw new Error('Unexpected response type');

      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('No JSON in response');

      return JSON.parse(jsonMatch[0]) as AIResumeEnhancement;
    } catch (err) {
      this.logger.error('Claude API error:', err);
      return this.getMockEnhancement(resumeData.personalInfo.summary);
    }
  }

  async generateCoverLetter(params: {
    resumeTitle: string;
    applicantName: string;
    targetCompany: string;
    targetRole: string;
    keySkills: string[];
    experience: string;
  }): Promise<string> {
    if (!this.anthropicClient) {
      return `Dear Hiring Manager at ${params.targetCompany},\n\nI am writing to express my interest in the ${params.targetRole} position...\n\nSincerely,\n${params.applicantName}`;
    }

    const prompt = `Write a professional cover letter for ${params.applicantName} applying to ${params.targetRole} at ${params.targetCompany}.
Key skills: ${params.keySkills.join(', ')}.
Experience summary: ${params.experience}

Write a compelling, concise cover letter (3 paragraphs max). Be specific and enthusiastic.`;

    const message = await this.anthropicClient.messages.create({
      model: 'claude-3-haiku-20240307',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    return content.type === 'text' ? content.text : 'Cover letter generation failed';
  }

  private getMockEnhancement(summary?: string): AIResumeEnhancement {
    return {
      enhancedSummary: summary || 'Results-driven software engineer with proven expertise in building scalable web applications. Passionate about clean code and modern development practices.',
      improvedBullets: [
        'Led development of microservices architecture, reducing system latency by 40%',
        'Implemented CI/CD pipelines, cutting deployment time by 60%',
        'Mentored 3 junior developers, improving team velocity by 25%',
        'Designed RESTful APIs serving 1M+ daily requests with 99.9% uptime',
        'Optimized database queries, reducing average response time from 500ms to 50ms',
      ],
      suggestedSkills: ['TypeScript', 'React', 'Node.js', 'Docker', 'Kubernetes', 'AWS', 'PostgreSQL', 'Redis', 'GraphQL', 'CI/CD'],
      atsScore: 78,
      suggestions: [
        'Add quantifiable metrics to all experience bullets',
        'Include relevant certifications section',
        'Customize summary for each target role',
        'Add GitHub profile with active repositories',
        'Include open source contributions',
      ],
    };
  }
}

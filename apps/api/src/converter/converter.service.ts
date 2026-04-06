import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as fs from 'fs';
import * as path from 'path';

export type SupportedFormat = 'docx' | 'txt' | 'md' | 'html';

export interface ConversionResult {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  outputPath?: string;
  error?: string;
}

@Injectable()
export class ConverterService {
  private readonly logger = new Logger(ConverterService.name);

  constructor(
    @InjectQueue('converter') private readonly converterQueue: Queue,
  ) {}

  async convertToPdf(
    file: Express.Multer.File,
    userId: string,
  ): Promise<ConversionResult> {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '') as SupportedFormat;
    const supportedFormats: SupportedFormat[] = ['docx', 'txt', 'md', 'html'];

    if (!supportedFormats.includes(ext)) {
      throw new BadRequestException(`Unsupported format: ${ext}. Supported: ${supportedFormats.join(', ')}`);
    }

    const job = await this.converterQueue.add('convert', {
      filePath: file.path,
      originalName: file.originalname,
      format: ext,
      userId,
    });

    this.logger.log(`Conversion job ${job.id} queued for ${file.originalname}`);

    return {
      jobId: job.id as string,
      status: 'queued',
    };
  }

  async getJobStatus(jobId: string): Promise<ConversionResult> {
    const job = await this.converterQueue.getJob(jobId);
    if (!job) throw new BadRequestException('Job not found');

    const state = await job.getState();
    const result = job.returnvalue as { outputPath?: string } | null;

    return {
      jobId,
      status: state === 'completed' ? 'completed' : state === 'failed' ? 'failed' : 'processing',
      outputPath: result?.outputPath,
      error: job.failedReason,
    };
  }

  async performConversion(
    filePath: string,
    format: SupportedFormat,
    userId: string,
  ): Promise<string> {
    const outputDir = path.join('./uploads', 'converted', userId);
    fs.mkdirSync(outputDir, { recursive: true });

    const outputFileName = `${Date.now()}-${path.basename(filePath, path.extname(filePath))}.pdf`;
    const outputPath = path.join(outputDir, outputFileName);

    // For production, integrate with actual conversion libraries:
    // - docx: use mammoth + puppeteer, or libreoffice CLI
    // - md: use marked + puppeteer
    // - html: use puppeteer
    // - txt: use basic HTML wrapper + puppeteer

    switch (format) {
      case 'txt':
      case 'md':
        await this.convertTextToPdf(filePath, outputPath, format);
        break;
      case 'html':
        await this.convertHtmlToPdf(filePath, outputPath);
        break;
      case 'docx':
        await this.convertDocxToPdf(filePath, outputPath);
        break;
      default:
        throw new BadRequestException(`Unsupported format: ${format}`);
    }

    return outputPath;
  }

  private async convertTextToPdf(inputPath: string, outputPath: string, format: 'txt' | 'md'): Promise<void> {
    // Placeholder: In production use puppeteer + marked (for md) or plain text
    const content = fs.readFileSync(inputPath, 'utf-8');
    const htmlContent = format === 'md'
      ? `<html><body><pre style="font-family: sans-serif; white-space: pre-wrap;">${this.escapeHtml(content)}</pre></body></html>`
      : `<html><body><pre style="font-family: monospace;">${this.escapeHtml(content)}</pre></body></html>`;

    // Write a stub PDF placeholder (replace with actual puppeteer call)
    fs.writeFileSync(outputPath, `%PDF-1.4 stub\n${htmlContent}`);
    this.logger.log(`Text/MD converted: ${outputPath}`);
  }

  private async convertHtmlToPdf(inputPath: string, outputPath: string): Promise<void> {
    const content = fs.readFileSync(inputPath, 'utf-8');
    // Write stub; replace with puppeteer.launch() -> page.setContent() -> page.pdf()
    fs.writeFileSync(outputPath, `%PDF-1.4 stub\n${content}`);
    this.logger.log(`HTML converted: ${outputPath}`);
  }

  private async convertDocxToPdf(inputPath: string, outputPath: string): Promise<void> {
    // Replace with: execSync(`libreoffice --headless --convert-to pdf ${inputPath} --outdir ${dir}`)
    // or use mammoth + puppeteer
    fs.writeFileSync(outputPath, `%PDF-1.4 stub for docx`);
    this.logger.log(`DOCX converted: ${outputPath}`);
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ConverterService, SupportedFormat } from './converter.service';

interface ConvertJobData {
  filePath: string;
  originalName: string;
  format: SupportedFormat;
  userId: string;
}

@Processor('converter')
export class ConverterProcessor {
  private readonly logger = new Logger(ConverterProcessor.name);

  constructor(private readonly converterService: ConverterService) {}

  @Process('convert')
  async handleConvert(job: Job<ConvertJobData>): Promise<{ outputPath: string }> {
    const { filePath, format, userId, originalName } = job.data;
    this.logger.log(`Converting ${originalName} (${format}) for user ${userId}`);

    await job.progress(20);
    const outputPath = await this.converterService.performConversion(filePath, format, userId);
    await job.progress(100);

    this.logger.log(`Conversion complete: ${outputPath}`);
    return { outputPath };
  }
}

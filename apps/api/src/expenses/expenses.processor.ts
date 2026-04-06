import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ExpensesService } from './expenses.service';

interface ParsePdfJobData {
  expenseId: string;
  filePath: string;
  userId: string;
}

@Processor('expenses')
export class ExpensesProcessor {
  private readonly logger = new Logger(ExpensesProcessor.name);

  constructor(private readonly expensesService: ExpensesService) {}

  @Process('parse-pdf')
  async handleParsePdf(job: Job<ParsePdfJobData>): Promise<void> {
    const { expenseId, filePath, userId } = job.data;
    this.logger.log(`Processing expense ${expenseId}`);

    await job.progress(10);
    await this.expensesService.parsePdfAndExtractTransactions(expenseId, filePath, userId);
    await job.progress(100);

    this.logger.log(`Completed expense ${expenseId}`);
  }
}

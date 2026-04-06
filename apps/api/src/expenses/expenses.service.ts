import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import * as fs from 'fs';
import * as pdfParse from 'pdf-parse';
import { Expense, ExpenseDocument, ExpenseStatus } from './schemas/expense.schema';
import { Transaction, TransactionDocument, TransactionType } from './schemas/transaction.schema';

@Injectable()
export class ExpensesService {
  private readonly logger = new Logger(ExpensesService.name);

  constructor(
    @InjectModel(Expense.name) private readonly expenseModel: Model<ExpenseDocument>,
    @InjectModel(Transaction.name) private readonly transactionModel: Model<TransactionDocument>,
    @InjectQueue('expenses') private readonly expenseQueue: Queue,
  ) {}

  async uploadExpense(
    userId: string,
    file: Express.Multer.File,
  ): Promise<ExpenseDocument> {
    const expense = await this.expenseModel.create({
      userId: new Types.ObjectId(userId),
      filename: file.filename,
      originalName: file.originalname,
      filePath: file.path,
      status: ExpenseStatus.PENDING,
    });

    await this.expenseQueue.add('parse-pdf', {
      expenseId: expense._id.toString(),
      filePath: file.path,
      userId,
    });

    return expense;
  }

  async findAll(userId: string): Promise<ExpenseDocument[]> {
    return this.expenseModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  async findOne(userId: string, id: string): Promise<ExpenseDocument> {
    const expense = await this.expenseModel.findById(id).exec();
    if (!expense) throw new NotFoundException('Expense not found');
    if (expense.userId.toString() !== userId) throw new ForbiddenException('Access denied');
    return expense;
  }

  async getTransactions(userId: string, expenseId?: string) {
    const query: Record<string, any> = { userId: new Types.ObjectId(userId) };
    if (expenseId) query.expenseId = new Types.ObjectId(expenseId);
    return this.transactionModel.find(query).sort({ date: -1 }).exec();
  }

  async getSpendingAnalytics(userId: string) {
    const [byCategory, byMonth, total] = await Promise.all([
      this.transactionModel.aggregate([
        { $match: { userId: new Types.ObjectId(userId), type: TransactionType.DEBIT } },
        { $group: { _id: '$category', total: { $sum: '$amount' }, count: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
      this.transactionModel.aggregate([
        { $match: { userId: new Types.ObjectId(userId), type: TransactionType.DEBIT } },
        {
          $group: {
            _id: { year: { $year: '$date' }, month: { $month: '$date' } },
            total: { $sum: '$amount' },
          },
        },
        { $sort: { '_id.year': -1, '_id.month': -1 } },
        { $limit: 12 },
      ]),
      this.transactionModel.aggregate([
        { $match: { userId: new Types.ObjectId(userId), type: TransactionType.DEBIT } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
    ]);

    return { byCategory, byMonth, total: total[0]?.total || 0 };
  }

  async parsePdfAndExtractTransactions(
    expenseId: string,
    filePath: string,
    userId: string,
  ): Promise<void> {
    try {
      await this.expenseModel.findByIdAndUpdate(expenseId, { status: ExpenseStatus.PROCESSING });

      const buffer = fs.readFileSync(filePath);
      const data = await pdfParse(buffer);
      const transactions = this.extractTransactionsFromText(data.text);

      const transactionDocs = transactions.map((t) => ({
        ...t,
        expenseId: new Types.ObjectId(expenseId),
        userId: new Types.ObjectId(userId),
      }));

      if (transactionDocs.length > 0) {
        await this.transactionModel.insertMany(transactionDocs);
      }

      const totalAmount = transactions
        .filter((t) => t.type === TransactionType.DEBIT)
        .reduce((sum, t) => sum + t.amount, 0);

      await this.expenseModel.findByIdAndUpdate(expenseId, {
        status: ExpenseStatus.PROCESSED,
        totalAmount,
        transactionCount: transactions.length,
      });

      this.logger.log(`Parsed ${transactions.length} transactions from expense ${expenseId}`);
    } catch (err) {
      this.logger.error(`Failed to parse expense ${expenseId}:`, err);
      await this.expenseModel.findByIdAndUpdate(expenseId, {
        status: ExpenseStatus.FAILED,
        errorMessage: (err as Error).message,
      });
    }
  }

  private extractTransactionsFromText(text: string) {
    const transactions: Array<{
      description: string;
      amount: number;
      type: TransactionType;
      date: Date | null;
      category: string;
      merchant: string | null;
    }> = [];

    // Pattern: date, description, amount (handles common bank statement formats)
    const linePattern = /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\s+(.+?)\s+([\-+]?\d{1,3}(?:,\d{3})*(?:\.\d{2})?)/g;
    let match;

    while ((match = linePattern.exec(text)) !== null) {
      const [, dateStr, description, amountStr] = match;
      const rawAmount = parseFloat(amountStr.replace(/,/g, ''));
      const amount = Math.abs(rawAmount);
      const type = rawAmount < 0 || description.toLowerCase().includes('purchase')
        ? TransactionType.DEBIT
        : TransactionType.CREDIT;

      let date: Date | null = null;
      try {
        date = new Date(dateStr);
        if (isNaN(date.getTime())) date = null;
      } catch {
        date = null;
      }

      transactions.push({
        description: description.trim(),
        amount,
        type,
        date,
        category: this.categorizeTransaction(description),
        merchant: this.extractMerchant(description),
      });
    }

    return transactions;
  }

  private categorizeTransaction(description: string): string {
    const desc = description.toLowerCase();
    if (/restaurant|food|cafe|pizza|burger|sushi|mcdonald|starbucks/.test(desc)) return 'Food & Dining';
    if (/uber|lyft|taxi|transport|parking|fuel|gas|bp|shell/.test(desc)) return 'Transportation';
    if (/amazon|walmart|target|shop|store|market/.test(desc)) return 'Shopping';
    if (/netflix|spotify|hulu|subscription|streaming/.test(desc)) return 'Entertainment';
    if (/electric|water|internet|utility|bill/.test(desc)) return 'Utilities';
    if (/doctor|hospital|pharmacy|medical|health/.test(desc)) return 'Healthcare';
    if (/rent|mortgage|lease/.test(desc)) return 'Housing';
    if (/salary|payroll|income|deposit/.test(desc)) return 'Income';
    return 'Other';
  }

  private extractMerchant(description: string): string | null {
    const parts = description.trim().split(/\s+/);
    return parts.length > 0 ? parts[0] : null;
  }

  async remove(userId: string, id: string): Promise<void> {
    const expense = await this.findOne(userId, id);
    await this.transactionModel.deleteMany({ expenseId: expense._id });
    await expense.deleteOne();
  }
}

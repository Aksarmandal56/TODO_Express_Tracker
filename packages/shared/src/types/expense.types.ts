export type ExpenseStatus = 'pending' | 'processing' | 'processed' | 'failed';
export type TransactionType = 'debit' | 'credit';

export interface Expense {
  _id: string;
  filename: string;
  originalName: string;
  filePath: string;
  userId: string;
  status: ExpenseStatus;
  totalAmount: number;
  currency: string;
  errorMessage?: string | null;
  transactionCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Transaction {
  _id: string;
  expenseId: string;
  userId: string;
  description: string;
  amount: number;
  currency: string;
  type: TransactionType;
  date?: Date | string | null;
  category: string;
  merchant?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface SpendingAnalytics {
  byCategory: Array<{ _id: string; total: number; count: number }>;
  byMonth: Array<{ _id: { year: number; month: number }; total: number }>;
  total: number;
}

import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bull';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { ExpensesProcessor } from './expenses.processor';
import { Expense, ExpenseSchema } from './schemas/expense.schema';
import { Transaction, TransactionSchema } from './schemas/transaction.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Expense.name, schema: ExpenseSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    BullModule.registerQueue({ name: 'expenses' }),
  ],
  controllers: [ExpensesController],
  providers: [ExpensesService, ExpensesProcessor],
  exports: [ExpensesService],
})
export class ExpensesModule {}

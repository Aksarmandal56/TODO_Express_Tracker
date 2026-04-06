import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ExpensesService } from './expenses.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateExpenseDto } from './dto/create-expense.dto';

const uploadStorage = diskStorage({
  destination: './uploads/expenses',
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@ApiTags('expenses')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('expenses')
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: uploadStorage,
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
          cb(null, true);
        } else {
          cb(new BadRequestException('Only PDF files are accepted'), false);
        }
      },
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    }),
  )
  @ApiOperation({ summary: 'Upload a PDF bank statement for parsing' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
        notes: { type: 'string' },
      },
    },
  })
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
    @Body() _dto: CreateExpenseDto,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.expensesService.uploadExpense(user.userId, file);
  }

  @Get()
  @ApiOperation({ summary: 'Get all expense files' })
  findAll(@CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.findAll(user.userId);
  }

  @Get('analytics')
  @ApiOperation({ summary: 'Get spending analytics' })
  getAnalytics(@CurrentUser() user: AuthenticatedUser) {
    return this.expensesService.getSpendingAnalytics(user.userId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get all transactions' })
  @Query('expenseId')
  getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('expenseId') expenseId?: string,
  ) {
    return this.expensesService.getTransactions(user.userId, expenseId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get expense by ID' })
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.expensesService.findOne(user.userId, id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an expense and its transactions' })
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.expensesService.remove(user.userId, id);
  }
}

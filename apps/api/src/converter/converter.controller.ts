import {
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { ConverterService } from './converter.service';
import { JwtAuthGuard } from '../auth/auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

const converterStorage = diskStorage({
  destination: './uploads/converter',
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@ApiTags('converter')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('converter')
export class ConverterController {
  constructor(private readonly converterService: ConverterService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: converterStorage,
      fileFilter: (_req, file, cb) => {
        const allowed = ['.docx', '.txt', '.md', '.html'];
        const ext = extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
          cb(null, true);
        } else {
          cb(new BadRequestException(`File type ${ext} not supported`), false);
        }
      },
      limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
    }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload a document to convert to PDF' })
  async upload(
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.converterService.convertToPdf(file, user.userId);
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Get conversion job status' })
  getStatus(@Param('jobId') jobId: string) {
    return this.converterService.getJobStatus(jobId);
  }
}

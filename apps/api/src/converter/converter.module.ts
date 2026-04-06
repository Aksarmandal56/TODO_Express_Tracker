import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConverterController } from './converter.controller';
import { ConverterService } from './converter.service';
import { ConverterProcessor } from './converter.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'converter' })],
  controllers: [ConverterController],
  providers: [ConverterService, ConverterProcessor],
  exports: [ConverterService],
})
export class ConverterModule {}

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bull';
import { AppController } from './app.controller';
import { AuthModule } from './auth/auth.module';
import { TasksModule } from './tasks/tasks.module';
import { RemindersModule } from './reminders/reminders.module';
import { ExpensesModule } from './expenses/expenses.module';
import { ResumeModule } from './resume/resume.module';
import { ConverterModule } from './converter/converter.module';
import { BillingModule } from './billing/billing.module';
import configuration from './common/config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get<string>('database.uri'),
        connectionFactory: (connection: any) => {
          connection.on('connected', () => console.log('MongoDB connected'));
          connection.on('error', (err: Error) => console.error('MongoDB error:', err));
          return connection;
        },
      }),
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get<string>('redis.url'),
      }),
    }),
    AuthModule,
    TasksModule,
    RemindersModule,
    ExpensesModule,
    ResumeModule,
    ConverterModule,
    BillingModule,
  ],
  controllers: [AppController],
})
export class AppModule {}

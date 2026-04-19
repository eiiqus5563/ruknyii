import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { QasehPaymentService } from './qaseh-payment.service';
import { QasehPaymentController } from './qaseh-payment.controller';
import { PrismaModule } from '../../core/database/prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [QasehPaymentController],
  providers: [QasehPaymentService],
  exports: [QasehPaymentService],
})
export class QasehPaymentModule {}

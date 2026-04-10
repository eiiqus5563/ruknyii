import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LinkedInController } from './linkedin.controller';
import { LinkedInService } from './linkedin.service';
import { PrismaModule } from '../../core/database/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [LinkedInController],
  providers: [LinkedInService],
  exports: [LinkedInService],
})
export class LinkedInModule {}

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { YouTubeController } from './youtube.controller';
import { YouTubeService } from './youtube.service';
import { PrismaModule } from '../../core/database/prisma/prisma.module';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [YouTubeController],
  providers: [YouTubeService],
  exports: [YouTubeService],
})
export class YouTubeModule {}

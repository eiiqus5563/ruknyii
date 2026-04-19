import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../core/common/decorators/auth/current-user.decorator';
import { UsageService } from './usage.service';

@ApiTags('Developer - Usage')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'developer/usage', version: '1' })
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get()
  @ApiOperation({ summary: 'ملخص الاستخدام' })
  getUsageSummary(@CurrentUser('id') userId: string) {
    return this.usageService.getUsageSummary(userId);
  }

  @Get('daily')
  @ApiOperation({ summary: 'الاستخدام اليومي' })
  getDailyUsage(
    @CurrentUser('id') userId: string,
    @Query('days') days?: string,
  ) {
    return this.usageService.getDailyUsage(userId, days ? parseInt(days, 10) : 30);
  }

  @Get('messages')
  @ApiOperation({ summary: 'تفاصيل الرسائل' })
  getMessageLogs(
    @CurrentUser('id') userId: string,
    @Query('status') status?: string,
    @Query('direction') direction?: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.usageService.getMessageLogs(userId, {
      status,
      direction,
      type,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      from,
      to,
    });
  }
}

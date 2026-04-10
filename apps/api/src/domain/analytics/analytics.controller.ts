import { Controller, Get, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../core/common/guards/auth/jwt-auth.guard';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
@Throttle({ default: { limit: 60, ttl: 60000 } })
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics overview for the authenticated user' })
  @ApiQuery({ name: 'days', required: false, type: Number, description: 'Number of days (default: 30)' })
  getOverview(@Request() req, @Query('days') days?: string) {
    const numDays = days ? Math.min(Math.max(parseInt(days, 10) || 30, 7), 90) : 30;
    return this.analyticsService.getOverview(req.user.id, numDays);
  }
}

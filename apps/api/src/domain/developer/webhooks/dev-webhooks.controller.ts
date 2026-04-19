import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../core/common/decorators/auth/current-user.decorator';
import { DevWebhooksService } from './dev-webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@ApiTags('Developer - Webhooks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'developer/webhooks', version: '1' })
export class DevWebhooksController {
  constructor(private readonly webhooksService: DevWebhooksService) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء webhook' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhooksService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة webhooks' })
  findAll(@CurrentUser('id') userId: string) {
    return this.webhooksService.findAll(userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تحديث webhook' })
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhooksService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف webhook' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.webhooksService.remove(userId, id);
  }

  @Post(':id/test')
  @ApiOperation({ summary: 'اختبار webhook بحدث تجريبي' })
  test(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.webhooksService.test(userId, id);
  }

  @Post(':id/rotate-secret')
  @ApiOperation({ summary: 'تدوير المفتاح السري' })
  rotateSecret(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
  ) {
    return this.webhooksService.rotateSecret(userId, id);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../../developer/api-keys/guards/api-key-auth.guard';
import { RequireScopes } from '../../developer/api-keys/decorators/require-scopes.decorator';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';

/**
 * 📨 WhatsApp Messaging API — الـ Public API
 *
 * يُستخدم بـ API Key (ليس JWT):
 *   X-API-Key: rk_live_xxxxxxxxxxxx
 */
@ApiTags('WhatsApp API - Messages')
@ApiHeader({ name: 'X-API-Key', required: true })
@UseGuards(ApiKeyAuthGuard)
@Controller({ path: 'whatsapp/messages', version: '1' })
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post()
  @RequireScopes('whatsapp:send')
  @ApiOperation({ summary: 'إرسال رسالة WhatsApp' })
  sendMessage(@Req() req: any, @Body() dto: SendMessageDto) {
    return this.messagingService.sendMessage(req.userId, req.apiKeyId, dto);
  }

  @Get(':id')
  @RequireScopes('whatsapp:read')
  @ApiOperation({ summary: 'حالة رسالة' })
  getMessageStatus(@Req() req: any, @Param('id') messageId: string) {
    return this.messagingService.getMessageStatus(req.userId, messageId);
  }
}

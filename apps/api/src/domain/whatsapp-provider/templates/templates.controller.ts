import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { ApiKeyAuthGuard } from '../../developer/api-keys/guards/api-key-auth.guard';
import { RequireScopes } from '../../developer/api-keys/decorators/require-scopes.decorator';
import { TemplatesService } from './templates.service';
import { CreateTemplateDto } from './dto/template.dto';

@ApiTags('WhatsApp API - Templates')
@ApiHeader({ name: 'X-API-Key', required: true })
@UseGuards(ApiKeyAuthGuard)
@Controller({ path: 'whatsapp/templates', version: '1' })
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @RequireScopes('templates:write')
  @ApiOperation({ summary: 'إنشاء قالب رسالة' })
  create(@Req() req: any, @Body() dto: CreateTemplateDto) {
    return this.templatesService.create(req.userId, req.apiKey?.developerAppId, dto);
  }

  @Get()
  @RequireScopes('templates:read')
  @ApiOperation({ summary: 'قائمة القوالب' })
  findAll(@Req() req: any) {
    return this.templatesService.findAll(req.userId, req.apiKey?.developerAppId);
  }

  @Get(':name')
  @RequireScopes('templates:read')
  @ApiOperation({ summary: 'تفاصيل قالب' })
  findOne(@Req() req: any, @Param('name') name: string) {
    return this.templatesService.findOne(req.userId, req.apiKey?.developerAppId, name);
  }

  @Delete(':name')
  @RequireScopes('templates:write')
  @ApiOperation({ summary: 'حذف قالب' })
  remove(@Req() req: any, @Param('name') name: string) {
    return this.templatesService.remove(req.userId, req.apiKey?.developerAppId, name);
  }

  @Post('sync')
  @RequireScopes('templates:read')
  @ApiOperation({ summary: 'مزامنة القوالب مع Meta' })
  sync(@Req() req: any) {
    return this.templatesService.syncTemplates(req.userId, req.apiKey?.developerAppId);
  }
}

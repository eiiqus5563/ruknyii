import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../core/common/decorators/auth/current-user.decorator';
import { ApiKeysService } from './api-keys.service';
import { TwoFactorService } from '../../auth/two-factor.service';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { UpdateApiKeyDto } from './dto/update-api-key.dto';

@ApiTags('Developer - API Keys')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'developer/api-keys', version: '1' })
export class ApiKeysController {
  constructor(
    private readonly apiKeysService: ApiKeysService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'إنشاء مفتاح API جديد' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateApiKeyDto,
  ) {
    return this.apiKeysService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة مفاتيح API' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('developerAppId') developerAppId?: string,
  ) {
    return this.apiKeysService.findAll(userId, developerAppId);
  }

  @Patch(':slug')
  @ApiOperation({ summary: 'تحديث مفتاح API' })
  update(
    @CurrentUser('id') userId: string,
    @Param('slug') keySlug: string,
    @Body() dto: UpdateApiKeyDto,
  ) {
    return this.apiKeysService.update(userId, keySlug, dto);
  }

  @Delete(':slug')
  @ApiOperation({ summary: 'إلغاء مفتاح API' })
  revoke(
    @CurrentUser('id') userId: string,
    @Param('slug') keySlug: string,
  ) {
    return this.apiKeysService.revoke(userId, keySlug);
  }

  @Post(':slug/reveal')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'كشف مفتاح API الكامل (يتطلب 2FA)' })
  async revealKey(
    @CurrentUser('id') userId: string,
    @Param('slug') keySlug: string,
    @Body() body: { token: string },
  ) {
    if (!body.token || body.token.length < 6) {
      throw new UnauthorizedException('رمز التحقق مطلوب');
    }

    // التحقق من أن 2FA مفعّل
    const status = await this.twoFactorService.getStatus(userId);
    if (!status.enabled) {
      throw new ForbiddenException('يجب تفعيل التحقق الثنائي أولاً');
    }

    // التحقق من رمز OTP
    const result = await this.twoFactorService.verifyToken(userId, body.token);
    if (!result.valid) {
      throw new UnauthorizedException('رمز التحقق غير صحيح');
    }

    return this.apiKeysService.revealKey(userId, keySlug);
  }
}

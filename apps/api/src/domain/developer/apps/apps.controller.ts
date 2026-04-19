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
import { AppsService } from './apps.service';
import { CreateAppDto } from './dto/create-app.dto';
import { UpdateAppDto } from './dto/update-app.dto';
import { SendAppOtpDto, VerifyAppOtpDto } from './dto/app-otp.dto';

@ApiTags('Developer - Apps')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'developer/apps', version: '1' })
export class AppsController {
  constructor(private readonly appsService: AppsService) {}

  @Post('otp/send')
  @ApiOperation({ summary: 'إرسال رمز تحقق عبر واتساب' })
  sendOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: SendAppOtpDto,
  ) {
    return this.appsService.sendOtp(userId, dto);
  }

  @Post('otp/verify')
  @ApiOperation({ summary: 'التحقق من رمز OTP' })
  verifyOtp(
    @CurrentUser('id') userId: string,
    @Body() dto: VerifyAppOtpDto,
  ) {
    return this.appsService.verifyOtpEndpoint(userId, dto);
  }

  @Post()
  @ApiOperation({ summary: 'إنشاء تطبيق جديد' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAppDto,
  ) {
    return this.appsService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'قائمة التطبيقات' })
  findAll(@CurrentUser('id') userId: string) {
    return this.appsService.findAll(userId);
  }

  @Get(':appId')
  @ApiOperation({ summary: 'تفاصيل تطبيق' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('appId') appId: string,
  ) {
    return this.appsService.findOne(userId, appId);
  }

  @Patch(':appId')
  @ApiOperation({ summary: 'تحديث تطبيق' })
  update(
    @CurrentUser('id') userId: string,
    @Param('appId') appId: string,
    @Body() dto: UpdateAppDto,
  ) {
    return this.appsService.update(userId, appId, dto);
  }

  @Delete(':appId')
  @ApiOperation({ summary: 'حذف تطبيق' })
  remove(
    @CurrentUser('id') userId: string,
    @Param('appId') appId: string,
  ) {
    return this.appsService.remove(userId, appId);
  }
}

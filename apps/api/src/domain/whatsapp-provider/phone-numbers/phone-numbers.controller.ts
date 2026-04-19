import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../core/common/decorators/auth/current-user.decorator';
import { PhoneNumbersService } from './phone-numbers.service';
import { RegisterPhoneDto, UpdatePhoneProfileDto } from './dto/phone-number.dto';
import { SendTestMessageDto } from './dto/send-test-message.dto';

@ApiTags('Developer - Phone Numbers')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'developer/whatsapp/phone-numbers', version: '1' })
export class PhoneNumbersController {
  constructor(private readonly phoneNumbersService: PhoneNumbersService) {}

  @Get()
  @ApiOperation({ summary: 'قائمة أرقام الهاتف' })
  findAll(
    @CurrentUser('id') userId: string,
    @Query('appId') appId: string,
  ) {
    return this.phoneNumbersService.findAll(userId, appId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'تفاصيل رقم هاتف' })
  findOne(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('appId') appId: string,
  ) {
    return this.phoneNumbersService.findOne(userId, appId, id);
  }

  @Post(':id/register')
  @ApiOperation({ summary: 'تسجيل رقم هاتف' })
  register(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('appId') appId: string,
    @Body() dto: RegisterPhoneDto,
  ) {
    return this.phoneNumbersService.register(userId, appId, id, dto);
  }

  @Patch(':id/profile')
  @ApiOperation({ summary: 'تحديث بروفايل الرقم' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('appId') appId: string,
    @Body() dto: UpdatePhoneProfileDto,
  ) {
    return this.phoneNumbersService.updateProfile(userId, appId, id, dto);
  }

  @Post(':id/send-test')
  @ApiOperation({ summary: 'إرسال رسالة اختبار hello_world' })
  sendTestMessage(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Query('appId') appId: string,
    @Body() dto: SendTestMessageDto,
  ) {
    return this.phoneNumbersService.sendTestMessage(userId, appId, id, dto);
  }
}

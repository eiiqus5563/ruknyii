import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../../core/common/decorators/auth/current-user.decorator';
import { WalletService } from './wallet.service';
import { AllocateAppBalanceDto, TopUpWalletDto, UpdateAutoRechargeDto, UpdateLowBalanceAlertDto } from './dto/wallet.dto';

@ApiTags('Developer - Wallet')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller({ path: 'developer/wallet', version: '1' })
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @ApiOperation({ summary: 'الحصول على المحفظة' })
  getWallet(@CurrentUser('id') userId: string) {
    return this.walletService.getWallet(userId);
  }

  @Get('apps/:appId')
  @ApiOperation({ summary: 'الحصول على رصيد تطبيق محدد' })
  getAppWallet(
    @CurrentUser('id') userId: string,
    @Param('appId') appId: string,
  ) {
    return this.walletService.getAppWallet(userId, appId);
  }

  @Post('apps/:appId/allocate')
  @ApiOperation({ summary: 'تحويل رصيد من المحفظة الرئيسية إلى التطبيق' })
  allocateToApp(
    @CurrentUser('id') userId: string,
    @Param('appId') appId: string,
    @Body() dto: AllocateAppBalanceDto,
  ) {
    return this.walletService.allocateToApp(userId, appId, dto.amount);
  }

  @Post('top-up')
  @ApiOperation({ summary: 'شحن الرصيد' })
  topUp(
    @CurrentUser('id') userId: string,
    @Body() dto: TopUpWalletDto,
  ) {
    return this.walletService.topUp(userId, dto);
  }

  @Post('top-up/:transactionId/verify')
  @ApiOperation({ summary: 'تأكيد الشحن بعد الدفع' })
  verifyTopUp(
    @CurrentUser('id') userId: string,
    @Param('transactionId') transactionId: string,
  ) {
    return this.walletService.verifyTopUp(userId, transactionId);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'قائمة المعاملات' })
  getTransactions(
    @CurrentUser('id') userId: string,
    @Query('type') type?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.walletService.getTransactions(userId, {
      type,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  @Get('auto-recharge')
  @ApiOperation({ summary: 'إعدادات الشحن التلقائي' })
  getAutoRecharge(@CurrentUser('id') userId: string) {
    return this.walletService.getAutoRecharge(userId);
  }

  @Patch('auto-recharge')
  @ApiOperation({ summary: 'تحديث إعدادات الشحن التلقائي' })
  updateAutoRecharge(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateAutoRechargeDto,
  ) {
    return this.walletService.updateAutoRecharge(userId, dto);
  }

  @Patch('low-balance-alert')
  @ApiOperation({ summary: 'تحديث تنبيه انخفاض الرصيد' })
  updateLowBalanceAlert(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLowBalanceAlertDto,
  ) {
    return this.walletService.updateLowBalanceAlert(userId, dto);
  }

  @Get('pricing')
  @ApiOperation({ summary: 'أسعار الرسائل' })
  getPricing() {
    return this.walletService.getPricing();
  }
}

import {
  Controller,
  Post,
  Get,
  Body,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { CheckoutAuthService } from './checkout-auth.service';
import {
  RequestCheckoutOtpDto,
  VerifyCheckoutOtpDto,
  ResendCheckoutOtpDto,
  OtpRequestResponse,
  OtpVerifyResponse,
  QuickLoginDto,
} from './dto/checkout-otp.dto';

/**
 * 📱 Checkout Auth Controller
 *
 * التحقق عبر واتساب للشراء كضيف
 *
 * الميزات:
 * - طلب OTP
 * - التحقق من OTP
 * - إعادة إرسال OTP
 */
@ApiTags('Checkout Auth')
@Controller('auth/checkout')
export class CheckoutAuthController {
  constructor(private readonly checkoutAuthService: CheckoutAuthService) {}

  private getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]?.trim() || 'unknown';
    }
    const realIp = req.headers['x-real-ip'];
    if (typeof realIp === 'string' && realIp.length > 0) return realIp;
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  /**
   * 📲 طلب رمز OTP للشراء
   */
  @Post('request-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } }) // 3 requests per minute
  @ApiOperation({
    summary: 'طلب رمز تحقق OTP',
    description: 'إرسال رمز تحقق عبر واتساب أو البريد الإلكتروني للشراء كضيف',
  })
  @ApiBody({ type: RequestCheckoutOtpDto })
  @ApiResponse({
    status: 200,
    description: 'تم إرسال رمز التحقق بنجاح',
    type: OtpRequestResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'خطأ في البيانات أو تجاوز حد الطلبات',
  })
  @ApiResponse({
    status: 429,
    description: 'تم تجاوز حد الطلبات (Rate Limit)',
  })
  async requestOtp(
    @Body() dto: RequestCheckoutOtpDto,
    @Req() req: Request,
  ): Promise<OtpRequestResponse> {
    return this.checkoutAuthService.requestOtp(dto, this.getClientIp(req));
  }

  /**
   * ✅ التحقق من رمز OTP
   */
  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  @ApiOperation({
    summary: 'التحقق من رمز OTP',
    description: 'التحقق من صحة الرمز وإنشاء جلسة للشراء',
  })
  @ApiBody({ type: VerifyCheckoutOtpDto })
  @ApiResponse({
    status: 200,
    description: 'تم التحقق بنجاح',
    type: OtpVerifyResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'رمز غير صحيح أو منتهي الصلاحية',
  })
  async verifyOtp(
    @Body() dto: VerifyCheckoutOtpDto,
    @Req() req: Request,
  ): Promise<OtpVerifyResponse> {
    return this.checkoutAuthService.verifyOtp(dto, this.getClientIp(req));
  }

  /**
   * 🔄 إعادة إرسال رمز OTP
   */
  @Post('resend-otp')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 60000 } }) // 2 resends per minute
  @ApiOperation({
    summary: 'إعادة إرسال رمز OTP',
    description: 'إعادة إرسال رمز التحقق عبر واتساب أو البريد الإلكتروني',
  })
  @ApiBody({ type: ResendCheckoutOtpDto })
  @ApiResponse({
    status: 200,
    description: 'تم إعادة إرسال الرمز بنجاح',
    type: OtpRequestResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'خطأ في البيانات أو تجاوز حد الطلبات',
  })
  @ApiResponse({
    status: 429,
    description: 'تم تجاوز حد الطلبات (Rate Limit)',
  })
  async resendOtp(
    @Body() dto: ResendCheckoutOtpDto,
    @Req() req: Request,
  ): Promise<OtpRequestResponse> {
    return this.checkoutAuthService.resendOtp(dto, this.getClientIp(req));
  }

  /**
   * � تسجيل سريع بدون OTP
   */
  @Post('quick-login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({
    summary: 'تسجيل سريع بدون رمز تحقق',
    description: 'إنشاء جلسة شراء مباشرة باستخدام رقم الهاتف والاسم بدون OTP',
  })
  @ApiBody({ type: QuickLoginDto })
  @ApiResponse({ status: 200, description: 'تم إنشاء الجلسة بنجاح' })
  async quickLogin(
    @Body() dto: QuickLoginDto,
    @Req() req: Request,
  ): Promise<OtpVerifyResponse> {
    return this.checkoutAuthService.quickLogin(dto, this.getClientIp(req));
  }

  /**
   * �🔍 فحص حالة خدمات الإرسال (WhatsApp & Email)
   */
  @Get('check-services')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'فحص حالة خدمات الإرسال',
    description: 'التحقق من حالة WhatsApp و Email Services',
  })
  @ApiResponse({
    status: 200,
    description: 'حالة الخدمات',
  })
  async checkServices() {
    return this.checkoutAuthService.checkServicesStatus();
  }
}

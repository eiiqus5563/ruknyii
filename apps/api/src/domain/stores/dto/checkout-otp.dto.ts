import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  Matches,
  Length,
  IsEmail,
  IsPhoneNumber,
  ValidateIf,
} from 'class-validator';

/**
 * 📱 نظام التحقق عبر واتساب للشراء كضيف
 * WhatsApp OTP Checkout System DTOs
 */

/**
 * DTO لطلب رمز OTP
 */
export class RequestCheckoutOtpDto {
  @ApiPropertyOptional({
    description: 'رقم الهاتف بالصيغة الدولية',
    example: '+9647701234567',
  })
  @IsOptional()
  @ValidateIf((o) => !o.email)
  @IsString()
  @Matches(/^\+964[0-9]{10}$/, {
    message: 'رقم الهاتف يجب أن يكون بالصيغة العراقية: +964XXXXXXXXXX',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'البريد الإلكتروني',
    example: 'ahmed@example.com',
  })
  @IsOptional()
  @ValidateIf((o) => !o.phoneNumber)
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email?: string;

  @ApiPropertyOptional({
    description:
      'تفضيل البريد الإلكتروني بدلاً من واتساب (مفيد عند بطء واتساب)',
    example: false,
    default: false,
  })
  @IsOptional()
  preferEmail?: boolean;
}

/**
 * DTO للتحقق من رمز OTP
 */
export class VerifyCheckoutOtpDto {
  @ApiPropertyOptional({
    description: 'رقم الهاتف',
    example: '+9647701234567',
  })
  @IsOptional()
  @ValidateIf((o) => !o.email)
  @IsString()
  @Matches(/^\+964[0-9]{10}$/, {
    message: 'رقم الهاتف يجب أن يكون بالصيغة العراقية: +964XXXXXXXXXX',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'البريد الإلكتروني',
    example: 'ahmed@example.com',
  })
  @IsOptional()
  @ValidateIf((o) => !o.phoneNumber)
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email?: string;

  @ApiProperty({
    description: 'رمز التحقق المكون من 6 أرقام',
    example: '458921',
  })
  @IsString()
  @Length(6, 6, { message: 'رمز التحقق يجب أن يكون 6 أرقام' })
  @Matches(/^[0-9]{6}$/, { message: 'رمز التحقق يجب أن يحتوي على أرقام فقط' })
  code: string;

  @ApiProperty({
    description: 'معرف OTP المُرجع من طلب الإرسال',
    example: 'uuid-otp-id',
  })
  @IsString()
  otpId: string;
}

/**
 * DTO للتسجيل السريع بدون OTP
 */
export class QuickLoginDto {
  @ApiProperty({
    description: 'رقم الهاتف بالصيغة الدولية',
    example: '+9647701234567',
  })
  @IsString()
  @Matches(/^\+964[0-9]{10}$/, {
    message: 'رقم الهاتف يجب أن يكون بالصيغة العراقية: +964XXXXXXXXXX',
  })
  phoneNumber: string;

  @ApiProperty({
    description: 'الاسم الكامل',
    example: 'أحمد محمد',
  })
  @IsString()
  @Length(3, 100, { message: 'الاسم يجب أن يكون 3 أحرف على الأقل' })
  fullName: string;
}

/**
 * DTO لإعادة إرسال OTP
 */
export class ResendCheckoutOtpDto {
  @ApiPropertyOptional({
    description: 'رقم الهاتف',
    example: '+9647701234567',
  })
  @IsOptional()
  @ValidateIf((o) => !o.email)
  @IsString()
  @Matches(/^\+964[0-9]{10}$/, {
    message: 'رقم الهاتف يجب أن يكون بالصيغة العراقية: +964XXXXXXXXXX',
  })
  phoneNumber?: string;

  @ApiPropertyOptional({
    description: 'قناة الإرسال المفضلة',
    enum: ['WHATSAPP', 'EMAIL'],
    default: 'WHATSAPP',
  })
  @IsOptional()
  @IsEnum(['WHATSAPP', 'EMAIL'])
  preferredChannel?: 'WHATSAPP' | 'EMAIL';

  @ApiPropertyOptional({
    description: 'البريد الإلكتروني (مطلوب إذا كانت القناة EMAIL)',
    example: 'ahmed@example.com',
  })
  @IsOptional()
  @IsEmail({}, { message: 'البريد الإلكتروني غير صالح' })
  email?: string;
}

/**
 * DTO لتتبع الطلب العام (آمن)
 * يتطلب رقم الطلب + آخر 4 أرقام من الهاتف
 */
export class TrackOrderDto {
  @ApiProperty({
    description: 'رقم الطلب',
    example: 'ORD-20260113-7845',
  })
  @IsString()
  @Matches(/^ORD-[A-Z0-9]+-[A-Z0-9]+$/, {
    message: 'صيغة رقم الطلب غير صحيحة',
  })
  orderNumber: string;

  @ApiProperty({
    description: 'آخر 4 أرقام من رقم الهاتف المسجل في الطلب',
    example: '4567',
  })
  @IsString()
  @Length(4, 4, { message: 'يجب إدخال آخر 4 أرقام من رقم الهاتف' })
  @Matches(/^[0-9]{4}$/, { message: 'يجب إدخال أرقام فقط' })
  phoneLast4: string;
}

/**
 * Response للـ OTP Request
 */
export class OtpRequestResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'تم إرسال رمز التحقق بنجاح' })
  message: string;

  @ApiProperty({ example: 'uuid-otp-id' })
  otpId: string;

  @ApiProperty({ example: 'WHATSAPP', enum: ['WHATSAPP', 'EMAIL'] })
  sentVia: string;

  @ApiProperty({
    example: 600,
    description: 'صلاحية الرمز بالثواني (10 دقائق)',
  })
  expiresIn: number;

  @ApiPropertyOptional({
    example: '+964770***4567',
    description: 'رقم الهاتف المخفي',
  })
  maskedPhone?: string;
}

/**
 * Response للـ OTP Verification
 */
export class OtpVerifyResponse {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'تم التحقق بنجاح' })
  message: string;

  @ApiProperty({ description: 'JWT Token للجلسة' })
  accessToken: string;

  @ApiProperty({ description: 'معرف المستخدم (تم إنشاؤه أو موجود)' })
  userId: string;

  @ApiProperty({ example: false, description: 'هل المستخدم جديد؟' })
  isNewUser: boolean;
}

/**
 * Response لتتبع الطلب
 */
export class TrackOrderResponse {
  @ApiProperty({ example: 'ORD-20260113-7845' })
  orderNumber: string;

  @ApiProperty({
    example: 'SHIPPED',
    enum: [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
      'CANCELLED',
    ],
  })
  status: string;

  @ApiProperty({ description: 'تفاصيل العنوان المختصرة' })
  deliveryAddress: {
    city: string;
    district?: string;
  };

  @ApiProperty({ example: '2026-01-15T10:00:00Z' })
  estimatedDelivery?: Date;

  @ApiProperty({ description: 'تاريخ آخر تحديث' })
  lastUpdate: Date;

  @ApiProperty({ description: 'اسم المتجر' })
  storeName: string;

  @ApiProperty({ description: 'عدد المنتجات' })
  itemsCount: number;

  @ApiProperty({ example: 3715000 })
  total: number;

  @ApiProperty({ example: 'IQD' })
  currency: string;
}

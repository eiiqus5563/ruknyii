import { IsString, IsOptional, IsEmail, IsEnum, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAppDto {
  @ApiProperty({ description: 'اسم التطبيق', example: 'My WhatsApp Bot' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'بريد التواصل للتطبيق', example: 'dev@example.com' })
  @IsEmail()
  contactEmail: string;

  @ApiProperty({ description: 'نوع التطبيق', enum: ['BUSINESS', 'CONSUMER'] })
  @IsEnum(['BUSINESS', 'CONSUMER'] as const)
  appType: 'BUSINESS' | 'CONSUMER';

  @ApiPropertyOptional({ description: 'وصف التطبيق' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ description: 'معرّف النشاط التجاري المرتبط' })
  @IsOptional()
  @IsString()
  businessId?: string;

  @ApiPropertyOptional({ description: 'رابط أيقونة التطبيق' })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: 'رمز التحقق من OTP' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  otpCode: string;
}

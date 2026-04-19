import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendAppOtpDto {
  @ApiProperty({ description: 'رقم الهاتف مع رمز الدولة', example: '9647701234567' })
  @IsString()
  @MinLength(10)
  @MaxLength(15)
  @Matches(/^\d+$/, { message: 'Phone number must contain only digits' })
  phoneNumber: string;
}

export class VerifyAppOtpDto {
  @ApiProperty({ description: 'رقم الهاتف', example: '9647701234567' })
  @IsString()
  phoneNumber: string;

  @ApiProperty({ description: 'رمز التحقق المكوّن من 6 أرقام' })
  @IsString()
  @MinLength(6)
  @MaxLength(6)
  code: string;
}

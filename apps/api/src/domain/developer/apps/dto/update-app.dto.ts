import { IsString, IsOptional, MinLength, MaxLength, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateAppDto {
  @ApiPropertyOptional({ description: 'اسم التطبيق' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

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
}

import { IsString, IsOptional, IsArray, IsIn, IsUUID, MinLength, MaxLength } from 'class-validator';

export class CreateTemplateDto {
  @IsString()
  @MinLength(1)
  @MaxLength(512)
  name: string;

  @IsString()
  @IsIn(['ar', 'en', 'en_US', 'ar_SA', 'ar_IQ'])
  language: string;

  @IsString()
  @IsIn(['AUTHENTICATION', 'MARKETING', 'UTILITY'])
  category: string;

  @IsArray()
  components: any[]; // Header, Body, Footer, Buttons

  @IsOptional()
  @IsUUID()
  accountId?: string;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsArray()
  components?: any[];
}

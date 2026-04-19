import { IsString, IsOptional, IsEmail, IsArray, MaxLength, Matches, IsBoolean } from 'class-validator';

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  customFields?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isValid?: boolean;
}

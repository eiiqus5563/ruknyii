import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RegisterPhoneDto {
  @IsString()
  pin: string; // 6-digit PIN for registration

  @IsOptional()
  @IsString()
  phoneNumberId?: string;
}

export class UpdatePhoneProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  about?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  websites?: string[];

  @IsOptional()
  @IsString()
  profilePictureUrl?: string;
}

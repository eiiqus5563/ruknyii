import { IsString, IsOptional, IsArray, IsIn, MaxLength, MinLength } from 'class-validator';

export class UpdateApiKeyDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(
    [
      'whatsapp:send',
      'whatsapp:read',
      'templates:read',
      'templates:write',
      'contacts:read',
      'contacts:write',
      'webhooks:manage',
      'media:upload',
    ],
    { each: true },
  )
  scopes?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  ipAllowlist?: string[];
}

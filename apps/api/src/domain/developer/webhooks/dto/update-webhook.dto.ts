import { IsString, IsArray, IsOptional, IsUrl, IsIn, MaxLength } from 'class-validator';

export class UpdateWebhookDto {
  @IsOptional()
  @IsUrl({ require_tld: true, require_protocol: true, protocols: ['https'] }, { message: 'Webhook URL must use HTTPS' })
  url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @IsIn(
    [
      'message.sent',
      'message.delivered',
      'message.read',
      'message.failed',
      'message.received',
      'template.approved',
      'template.rejected',
      'template.status_updated',
      'account.status_updated',
      'phone.quality_updated',
    ],
    { each: true },
  )
  events?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'PAUSED'])
  status?: string;
}

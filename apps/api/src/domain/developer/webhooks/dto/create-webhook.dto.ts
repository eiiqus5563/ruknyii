import { IsString, IsArray, IsOptional, IsUrl, MinLength, IsIn, MaxLength } from 'class-validator';

export class CreateWebhookDto {
  @IsUrl({ require_tld: true, require_protocol: true, protocols: ['https'] }, { message: 'Webhook URL must use HTTPS' })
  url: string;

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
  events: string[];

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;
}

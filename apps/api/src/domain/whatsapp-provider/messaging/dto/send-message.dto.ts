import { IsString, IsOptional, IsObject, ValidateNested, IsIn, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  to: string; // رقم المستلم

  @IsString()
  @IsIn(['text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contacts', 'template', 'interactive'])
  type: string;

  @IsOptional()
  @IsString()
  phoneNumberId?: string; // اختياري — يستخدم الأول إن لم يُحدد

  @IsOptional()
  @IsObject()
  text?: { body: string; preview_url?: boolean };

  @IsOptional()
  @IsObject()
  image?: { link?: string; id?: string; caption?: string };

  @IsOptional()
  @IsObject()
  video?: { link?: string; id?: string; caption?: string };

  @IsOptional()
  @IsObject()
  audio?: { link?: string; id?: string };

  @IsOptional()
  @IsObject()
  document?: { link?: string; id?: string; filename?: string; caption?: string };

  @IsOptional()
  @IsObject()
  sticker?: { link?: string; id?: string };

  @IsOptional()
  @IsObject()
  location?: { latitude: number; longitude: number; name?: string; address?: string };

  @IsOptional()
  contacts?: any[];

  @IsOptional()
  @IsObject()
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };

  @IsOptional()
  @IsObject()
  interactive?: {
    type: string;
    header?: any;
    body: any;
    footer?: any;
    action: any;
  };
}

import { IsString, IsOptional } from 'class-validator';

export class ConnectWabaDto {
  @IsString()
  code: string; // الكود من Meta Embedded Signup callback

  @IsString()
  appId: string;

  @IsOptional()
  @IsString()
  wabaId?: string; // اختياري — إن كان المطوّر يعرفه مسبقاً
}

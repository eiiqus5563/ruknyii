import { IsString, Matches } from 'class-validator';

export class SendTestMessageDto {
  @IsString()
  @Matches(/^\+?\d{10,15}$/, { message: 'Invalid phone number format' })
  to: string;
}

import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { WhatsAppBusinessService } from './whatsapp-business.service';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [WhatsAppBusinessService],
  exports: [WhatsAppBusinessService],
})
export class WhatsAppBusinessModule {}

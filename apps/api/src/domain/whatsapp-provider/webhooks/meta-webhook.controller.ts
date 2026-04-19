import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  HttpCode,
  HttpStatus,
  RawBodyRequest,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import * as crypto from 'crypto';
import { MetaWebhookService } from './meta-webhook.service';

@ApiTags('Meta Webhooks')
@Controller({ path: 'webhooks/meta', version: '1' })
export class MetaWebhookController {
  constructor(
    private readonly metaWebhookService: MetaWebhookService,
    private readonly configService: ConfigService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Meta webhook verification' })
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    const verifyToken = this.configService.get<string>('META_WEBHOOK_VERIFY_TOKEN');

    if (mode === 'subscribe' && token === verifyToken) {
      return Number(challenge);
    }

    throw new ForbiddenException('Verification failed');
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async receive(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: any,
  ) {
    this.verifySignature(req);
    await this.metaWebhookService.handleWebhook(body);
    return { status: 'ok' };
  }

  private verifySignature(req: RawBodyRequest<Request>): void {
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature) {
      throw new ForbiddenException('Missing signature');
    }

    const appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET');
    const rawBody = req.rawBody;

    if (!rawBody) {
      throw new ForbiddenException('Missing raw body');
    }

    const expectedSignature =
      'sha256=' +
      crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');

    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      throw new ForbiddenException('Invalid signature');
    }
  }
}

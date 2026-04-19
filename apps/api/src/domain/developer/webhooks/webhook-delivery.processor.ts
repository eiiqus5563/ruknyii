import { Process, Processor, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { WebhookDeliveryService } from './webhook-delivery.service';

@Processor('webhook-delivery')
export class WebhookDeliveryProcessor {
  private readonly logger = new Logger(WebhookDeliveryProcessor.name);

  constructor(
    private readonly webhookDeliveryService: WebhookDeliveryService,
  ) {}

  @Process('deliver')
  async handleDelivery(job: Job): Promise<void> {
    this.logger.debug(`Processing webhook delivery for webhook ${job.data?.webhookId} (attempt ${job.attemptsMade + 1})`);

    await this.webhookDeliveryService.processDelivery(job.data);
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Webhook delivery ${job.data?.deliveryLogId} failed: ${error.message}`,
      error.stack,
    );
  }
}

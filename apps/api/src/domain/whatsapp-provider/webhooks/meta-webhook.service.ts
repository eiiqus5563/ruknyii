import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { WebhookDeliveryService } from '../../developer/webhooks/webhook-delivery.service';

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly webhookDelivery: WebhookDeliveryService,
  ) {}

  async handleWebhook(body: any): Promise<void> {
    const entries = body?.entry || [];

    for (const entry of entries) {
      const wabaId = entry.id;
      const changes = entry.changes || [];

      for (const change of changes) {
        const field = change.field;
        const value = change.value;

        switch (field) {
          case 'messages':
            await this.handleMessages(wabaId, value);
            break;
          case 'message_template_status_update':
            await this.handleTemplateStatusUpdate(wabaId, value);
            break;
          case 'account_update':
            await this.handleAccountUpdate(wabaId, value);
            break;
          default:
            this.logger.debug(`Unhandled webhook field: ${field}`);
        }
      }
    }
  }

  private async handleMessages(wabaId: string, value: any): Promise<void> {
    const metadata = value?.metadata;
    const phoneNumberId = metadata?.phone_number_id;

    const account = await this.findAccountByWabaId(wabaId);
    if (!account) return;

    // Handle message status updates
    const statuses = value?.statuses || [];
    for (const status of statuses) {
      await this.handleMessageStatus(account.userId, status);
    }

    // Handle incoming messages
    const messages = value?.messages || [];
    for (const message of messages) {
      await this.handleIncomingMessage(account.userId, phoneNumberId, message, value?.contacts);
    }
  }

  private async handleMessageStatus(userId: string, status: any): Promise<void> {
    const messageId = status?.id;
    const statusValue = status?.status;

    if (!messageId || !statusValue) return;

    const statusMap: Record<string, string> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    };

    const mappedStatus = statusMap[statusValue];
    if (!mappedStatus) return;

    try {
      const log = await this.prisma.whatsappMessageLog.findFirst({
        where: { metaMessageId: messageId },
      });

      if (!log) return;

      await this.prisma.whatsappMessageLog.update({
        where: { id: log.id },
        data: {
          status: mappedStatus as any,
          ...(statusValue === 'failed' && status?.errors?.[0]
            ? { errorMessage: status.errors[0].message }
            : {}),
        },
      });

      await this.webhookDelivery.dispatchEvent(userId, `message.${statusValue}`, {
        messageId: log.id,
        metaMessageId: messageId,
        status: statusValue,
        timestamp: status?.timestamp,
        ...(status?.errors?.[0] ? { error: status.errors[0] } : {}),
      });
    } catch (error) {
      this.logger.error(`Failed to update message status: ${error.message}`, error.stack);
    }
  }

  private async handleIncomingMessage(
    userId: string,
    phoneNumberId: string,
    message: any,
    contacts: any[],
  ): Promise<void> {
    try {
      const phone = await this.prisma.developerPhoneNumber.findFirst({
        where: { phoneNumberId },
      });

      if (!phone) return;

      const contact = contacts?.[0];
      const from = message?.from;
      const messageType = (message?.type || 'text').toUpperCase();

      const log = await this.prisma.whatsappMessageLog.create({
        data: {
          userId,
          accountId: phone.accountId,
          phoneNumberId: phone.id,
          recipientNumber: phone.phoneNumber,
          senderNumber: from,
          direction: 'INBOUND',
          messageType: messageType as any,
          content: message,
          status: 'DELIVERED',
          metaMessageId: message?.id,
        },
      });

      await this.webhookDelivery.dispatchEvent(userId, 'message.received', {
        messageId: log.id,
        from,
        to: phone.phoneNumber,
        type: message?.type,
        content: message,
        contact: contact?.profile,
        timestamp: message?.timestamp,
      });
    } catch (error) {
      this.logger.error(`Failed to handle incoming message: ${error.message}`, error.stack);
    }
  }

  private async handleTemplateStatusUpdate(wabaId: string, value: any): Promise<void> {
    const event = value?.event;
    const messageTemplateName = value?.message_template_name;
    const messageTemplateId = value?.message_template_id?.toString();

    if (!messageTemplateName) return;

    const account = await this.findAccountByWabaId(wabaId);
    if (!account) return;

    const statusMap: Record<string, string> = {
      APPROVED: 'APPROVED',
      REJECTED: 'REJECTED',
      PENDING_DELETION: 'REJECTED',
      DISABLED: 'REJECTED',
    };

    const mappedStatus = statusMap[event];

    try {
      const template = await this.prisma.developerWhatsappTemplate.findFirst({
        where: {
          accountId: account.id,
          ...(messageTemplateId
            ? { metaTemplateId: messageTemplateId }
            : { name: messageTemplateName }),
        },
      });

      if (template && mappedStatus) {
        await this.prisma.developerWhatsappTemplate.update({
          where: { id: template.id },
          data: {
            status: mappedStatus as any,
            rejectedReason: event === 'REJECTED' ? value?.reason : null,
          },
        });
      }

      await this.webhookDelivery.dispatchEvent(account.userId, 'template.status_update', {
        templateName: messageTemplateName,
        templateId: template?.id,
        event,
        reason: value?.reason,
      });
    } catch (error) {
      this.logger.error(`Failed to handle template status update: ${error.message}`, error.stack);
    }
  }

  private async handleAccountUpdate(wabaId: string, value: any): Promise<void> {
    const account = await this.findAccountByWabaId(wabaId);
    if (!account) return;

    try {
      const event = value?.event;

      if (event === 'DISABLED' || event === 'FLAGGED') {
        await this.prisma.developerWhatsappAccount.update({
          where: { id: account.id },
          data: { status: event === 'DISABLED' ? 'SUSPENDED' : 'ACTIVE' },
        });
      }

      await this.webhookDelivery.dispatchEvent(account.userId, 'account.update', {
        accountId: account.id,
        wabaId,
        event,
        details: value,
      });
    } catch (error) {
      this.logger.error(`Failed to handle account update: ${error.message}`, error.stack);
    }
  }

  private async findAccountByWabaId(wabaId: string) {
    return this.prisma.developerWhatsappAccount.findFirst({
      where: { wabaId, status: { not: 'DISCONNECTED' } },
    });
  }
}

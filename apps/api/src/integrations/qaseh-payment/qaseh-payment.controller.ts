/**
 * 💳 Al-Qaseh Payment Gateway - Controller
 *
 * Handles payment initiation, callback, and webhook endpoints.
 */

import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  Req,
  Res,
  Logger,
  BadRequestException,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { QasehPaymentService } from './qaseh-payment.service';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { CheckoutSessionGuard } from '../../core/common/guards/auth/checkout-session.guard';

@ApiTags('Payments - Qaseh')
@Controller('payments/qaseh')
export class QasehPaymentController {
  private readonly logger = new Logger(QasehPaymentController.name);

  constructor(
    private readonly qasehService: QasehPaymentService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 💳 Initiate payment for an existing order
   * Called after order is created with paymentMethod = QASEH_CARD
   */
  @Post('initiate/:orderId')
  @UseGuards(CheckoutSessionGuard)
  @ApiOperation({ summary: 'بدء عملية الدفع لطلب موجود' })
  @ApiResponse({ status: 200, description: 'تم إنشاء جلسة الدفع' })
  async initiatePayment(
    @Param('orderId') orderId: string,
    @Req() req: any,
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      include: {
        stores: { select: { name: true } },
        order_items: { select: { productName: true, quantity: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }

    if (order.paymentStatus !== 'UNPAID' && order.paymentStatus !== 'FAILED') {
      throw new BadRequestException('هذا الطلب تم دفعه بالفعل أو قيد المعالجة');
    }

    // Build description from order items
    const itemDescriptions = order.order_items
      .map((item) => `${item.productName} x${item.quantity}`)
      .join(', ');
    const description = `طلب ${order.orderNumber} - ${order.stores.name}: ${itemDescriptions}`.substring(0, 250);

    try {
      const payment = await this.qasehService.createPayment({
        orderId: order.orderNumber,
        amount: Number(order.total),
        currency: order.currency,
        description,
        customData: {
          rukny_order_id: order.id,
          store_name: order.stores.name,
        },
      });

      // Update order with payment info
      await this.prisma.orders.update({
        where: { id: orderId },
        data: {
          paymentId: payment.payment_id,
          paymentToken: payment.token,
          paymentStatus: 'PENDING',
          paymentMethod: 'QASEH_CARD',
        },
      });

      this.logger.log(`Payment initiated for order ${order.orderNumber}: ${payment.payment_id}`);

      return {
        success: true,
        paymentId: payment.payment_id,
        paymentUrl: this.qasehService.getPaymentPageUrl(payment.token),
        token: payment.token,
      };
    } catch (error) {
      this.logger.error(`Failed to initiate payment for order ${orderId}:`, error);
      throw new BadRequestException('فشل في إنشاء جلسة الدفع. حاول مرة أخرى.');
    }
  }

  /**
   * 🔔 Webhook - Qaseh sends payment status updates here
   * This endpoint must be publicly accessible (no auth guard)
   */
  @Post('webhook')
  @ApiOperation({ summary: 'Qaseh Webhook - استقبال تحديثات الدفع' })
  async handleWebhook(
    @Body() body: any,
    @Req() req: Request,
  ) {
    this.logger.log(`Qaseh Webhook received: ${JSON.stringify(body)}`);

    const paymentId = body.payment_id;
    if (!paymentId) {
      this.logger.warn('Webhook received without payment_id');
      return { status: 'ignored' };
    }

    try {
      // Verify payment status with Qaseh API (don't trust webhook body alone)
      const paymentContext = await this.qasehService.getPaymentContext(paymentId);

      // Find order by paymentId
      const order = await this.prisma.orders.findFirst({
        where: { paymentId },
      });

      if (!order) {
        this.logger.warn(`No order found for payment_id: ${paymentId}`);
        return { status: 'order_not_found' };
      }

      // Map Qaseh status to our OrderPaymentStatus
      const newPaymentStatus = this.mapPaymentStatus(paymentContext.payment_status);

      // Update order payment status
      const updateData: any = { paymentStatus: newPaymentStatus };

      // If payment succeeded, confirm the order
      if (paymentContext.payment_status === 'succeeded') {
        updateData.status = 'CONFIRMED';
      }

      // If payment failed/declined/expired, mark accordingly
      if (['failed', 'declined', 'expired'].includes(paymentContext.payment_status)) {
        updateData.paymentStatus = 'FAILED';
      }

      await this.prisma.orders.update({
        where: { id: order.id },
        data: updateData,
      });

      this.logger.log(
        `Order ${order.orderNumber} payment status updated: ${paymentContext.payment_status} → ${newPaymentStatus}`,
      );

      return { status: 'processed' };
    } catch (error) {
      this.logger.error(`Webhook processing error for payment ${paymentId}:`, error);
      return { status: 'error' };
    }
  }

  /**
   * 🔄 Callback - User is redirected here after payment
   * Qaseh redirects with: ?payment_id=...&order_id=...&status=...
   */
  @Get('callback')
  @ApiOperation({ summary: 'Qaseh Callback - إعادة توجيه العميل بعد الدفع' })
  async handleCallback(
    @Query('payment_id') paymentId: string,
    @Query('order_id') orderId: string,
    @Query('status') status: string,
    @Res() res: Response,
  ) {
    const frontendUrl = this.qasehService['config'].get<string>('FRONTEND_URL', 'http://localhost:3000');

    this.logger.log(`Qaseh callback: payment_id=${paymentId}, order_id=${orderId}, status=${status}`);

    if (!paymentId) {
      return res.redirect(`${frontendUrl}/payment/failed?error=missing_params`);
    }

    try {
      // Find order by paymentId
      const order = await this.prisma.orders.findFirst({
        where: { paymentId },
        include: {
          stores: { select: { slug: true } },
        },
      });

      if (!order) {
        this.logger.warn(`No order found for payment_id: ${paymentId}`);
        return res.redirect(`${frontendUrl}/payment/failed?error=order_not_found`);
      }

      // Verify payment status with Qaseh API (don't trust redirect params alone)
      const paymentContext = await this.qasehService.getPaymentContext(paymentId);
      const newPaymentStatus = this.mapPaymentStatus(paymentContext.payment_status);

      const updateData: any = { paymentStatus: newPaymentStatus };
      if (paymentContext.payment_status === 'succeeded') {
        updateData.status = 'CONFIRMED';
      }
      if (['failed', 'declined', 'expired'].includes(paymentContext.payment_status)) {
        updateData.paymentStatus = 'FAILED';
      }

      await this.prisma.orders.update({
        where: { id: order.id },
        data: updateData,
      });

      this.logger.log(`Order ${order.orderNumber} updated: ${paymentContext.payment_status} → ${newPaymentStatus}`);

      if (paymentContext.payment_status === 'succeeded') {
        return res.redirect(
          `${frontendUrl}/payment/success?orders=${encodeURIComponent(order.orderNumber)}&store=${encodeURIComponent(order.stores?.slug || '')}&paid=1`,
        );
      }

      // Payment not successful
      return res.redirect(
        `${frontendUrl}/payment/failed?order=${encodeURIComponent(order.orderNumber)}&status=${newPaymentStatus}`,
      );
    } catch (error) {
      this.logger.error('Callback processing error:', error);
      return res.redirect(`${frontendUrl}/payment/failed?error=processing_error`);
    }
  }

  /**
   * 📊 Check payment status for an order
   */
  @Get('status/:orderId')
  @ApiOperation({ summary: 'التحقق من حالة الدفع' })
  async checkPaymentStatus(@Param('orderId') orderId: string) {
    const order = await this.prisma.orders.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        paymentId: true,
        paymentStatus: true,
        paymentMethod: true,
        total: true,
        currency: true,
      },
    });

    if (!order) {
      throw new NotFoundException('الطلب غير موجود');
    }

    // If we have a payment ID, check with Qaseh for latest status
    if (order.paymentId) {
      try {
        const paymentContext = await this.qasehService.getPaymentContext(order.paymentId);
        return {
          orderId: order.id,
          orderNumber: order.orderNumber,
          paymentStatus: order.paymentStatus,
          qasehStatus: paymentContext.payment_status,
          amount: Number(order.total),
          currency: order.currency,
        };
      } catch {
        // Fall through to return local status
      }
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentStatus: order.paymentStatus,
      amount: Number(order.total),
      currency: order.currency,
    };
  }

  /**
   * Map Qaseh payment status to our OrderPaymentStatus enum
   */
  private mapPaymentStatus(qasehStatus: string): string {
    switch (qasehStatus) {
      case 'succeeded':
        return 'PAID';
      case 'prepared':
      case 'retried':
        return 'PENDING';
      case 'failed':
      case 'declined':
      case 'expired':
      case 'unknown':
        return 'FAILED';
      case 'revoked':
        return 'UNPAID';
      default:
        return 'PENDING';
    }
  }
}

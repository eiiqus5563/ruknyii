import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import {
  IsString,
  IsArray,
  ValidateNested,
  IsOptional,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CheckoutSessionGuard } from '../../core/common/guards/auth/checkout-session.guard';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { QasehPaymentService } from '../../integrations/qaseh-payment/qaseh-payment.service';

/**
 * Item في السلة
 */
class OrderItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  price: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  variantId?: string;
}

/**
 * DTO لإنشاء طلب من checkout
 */
class CreateCheckoutOrderDto {
  @ApiProperty()
  @IsString()
  storeId: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @ApiProperty()
  @IsString()
  @Transform(({ value }) => String(value))
  @IsOptional()
  shippingAddressId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsEnum(['CASH', 'QASEH_CARD', 'BANK_TRANSFER'])
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  subtotal?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  shippingCost?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  total?: number;
}

/**
 * 🛒 Checkout Orders Controller
 *
 * إنشاء طلبات للمستخدمين الضيوف باستخدام جلسة checkout
 */
@ApiTags('Checkout Orders')
@ApiBearerAuth()
@UseGuards(CheckoutSessionGuard)
@Controller('checkout/orders')
export class CheckoutOrdersController {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly prisma: PrismaService,
    private readonly qasehPayment: QasehPaymentService,
  ) {}

  /**
   * 📦 إنشاء طلب جديد (للضيوف)
   */
  @Post()
  @ApiOperation({ summary: 'إنشاء طلب جديد للضيف' })
  @ApiResponse({ status: 201, description: 'تم إنشاء الطلب بنجاح' })
  @ApiResponse({ status: 400, description: 'بيانات غير صحيحة' })
  @ApiResponse({ status: 401, description: 'جلسة غير صالحة' })
  async createGuestOrder(
    @Body() createOrderDto: CreateCheckoutOrderDto,
    @Req() req: any,
  ) {
    console.log(
      '📦 Checkout Order Data:',
      JSON.stringify(createOrderDto, null, 2),
    );
    console.log('🔐 Session Info:', {
      userId: req.checkoutSession?.userId,
      phone: req.checkoutSession?.phoneNumber,
      email: req.checkoutSession?.email,
    });

    let userId = req.checkoutSession?.userId;
    const sessionPhone = req.checkoutSession?.phoneNumber;
    const sessionEmail = req.checkoutSession?.email;

    // إذا لم يكن هناك userId، نبحث عن المستخدم أو ننشئ واحد مؤقت
    if (!userId) {
      console.log('⚠️ No userId in session, searching for existing user...');

      // البحث عن مستخدم موجود
      let user = sessionPhone
        ? await this.prisma.user.findFirst({
            where: { phoneNumber: sessionPhone },
          })
        : await this.prisma.user.findFirst({ where: { email: sessionEmail } });

      // إنشاء مستخدم مؤقت إذا لم يكن موجوداً
      if (!user) {
        console.log('✨ Creating temporary user...');
        user = await this.prisma.user.create({
          data: {
            phoneNumber: sessionPhone,
            email: sessionEmail,
            role: 'GUEST',
            emailVerified: false,
          },
        });
        console.log('✅ Temporary user created:', user.id);
      }

      userId = user.id;
    }

    console.log('👤 Final userId:', userId);

    try {
      // Link the shipping address to the user before creating orders
      if (createOrderDto.shippingAddressId) {
        await this.prisma.addresses.updateMany({
          where: { id: createOrderDto.shippingAddressId, userId: null },
          data: { userId },
        });
      }

      // Create a single order with all items
      const order = await this.ordersService.createDirectMultiItem(
        userId,
        {
          addressId: createOrderDto.shippingAddressId,
          customerNote: createOrderDto.notes,
          phoneNumber: sessionPhone || createOrderDto.phoneNumber,
          paymentMethod: createOrderDto.paymentMethod || 'CASH',
          items: createOrderDto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            ...(item.variantId ? { variantId: item.variantId } : {}),
          })),
        },
      );

      console.log(`✅ Order created: ${order.id}`);

      // 💳 If payment method is QASEH_CARD, initiate payment
      if (createOrderDto.paymentMethod === 'QASEH_CARD' && this.qasehPayment.isConfigured()) {
        try {
          const itemDescriptions = createOrderDto.items
            .map((item, i) => `${i + 1}. x${item.quantity}`)
            .join(', ');
          const description = `طلب ${order.orderNumber}: ${itemDescriptions}`.substring(0, 250);

          const payment = await this.qasehPayment.createPayment({
            orderId: order.orderNumber,
            amount: Number(order.total),
            currency: order.currency || 'IQD',
            description,
            customData: { rukny_order_id: order.id },
          });

          // Update order with Qaseh payment info
          await this.prisma.orders.update({
            where: { id: order.id },
            data: {
              paymentId: payment.payment_id,
              paymentToken: payment.token,
              paymentStatus: 'PENDING',
            },
          });

          return {
            success: true,
            message: 'تم إنشاء الطلب - يرجى إكمال الدفع',
            orders: [{ ...order, paymentId: payment.payment_id }],
            payment: {
              paymentId: payment.payment_id,
              paymentUrl: this.qasehPayment.getPaymentPageUrl(payment.token),
              token: payment.token,
            },
          };
        } catch (paymentError) {
          console.error('❌ Qaseh payment initiation failed:', paymentError);
          // Order is still created, payment can be retried
          return {
            success: true,
            message: 'تم إنشاء الطلب لكن فشل بدء الدفع. يمكنك إعادة المحاولة.',
            orders: [order],
            paymentError: true,
          };
        }
      }

      return {
        success: true,
        message: 'تم إنشاء الطلب بنجاح',
        orders: [order],
      };
    } catch (error) {
      console.error('❌ Error creating order:', error);
      throw error;
    }
  }
}

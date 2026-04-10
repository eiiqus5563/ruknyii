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
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { CheckoutSessionGuard } from '../../core/common/guards/auth/checkout-session.guard';
import { OrdersService } from './orders.service';
import { PrismaService } from '../../core/database/prisma/prisma.service';

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
          items: createOrderDto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            ...(item.variantId ? { variantId: item.variantId } : {}),
          })),
        },
      );

      console.log(`✅ Order created: ${order.id}`);

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

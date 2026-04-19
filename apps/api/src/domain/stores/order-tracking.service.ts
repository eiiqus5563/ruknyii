import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../core/database/prisma/prisma.service';
import { WhatsAppBusinessService } from '../../integrations/whatsapp-business/whatsapp-business.service';
import S3Service from '../../services/s3.service';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';

/**
 * 📦 خدمة تتبع الطلبات - Order Tracking Service
 *
 * تتبع آمن للطلبات عبر OTP
 * - طلب OTP لرقم الهاتف
 * - التحقق وعرض الطلبات
 * - جلسة تتبع قصيرة (30 دقيقة)
 */

// Constants
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 3;
const TRACKING_SESSION_MINUTES = 30;
const BCRYPT_ROUNDS = 10;

// Interfaces
export interface TrackingOtpRequest {
  phoneNumber: string;
  orderNumber?: string; // اختياري - للتحقق من وجود الطلب
}

export interface TrackingOtpVerify {
  phoneNumber: string;
  code: string;
  otpId: string;
}

export interface TrackingSession {
  success: boolean;
  accessToken: string;
  expiresIn: number;
  orders: OrderSummary[];
}

export interface OrderSummary {
  orderNumber: string;
  status: string;
  statusLabel: string;
  storeName: string;
  total: number;
  currency: string;
  itemsCount: number;
  createdAt: Date;
  estimatedDelivery?: Date;
}

export interface OrderDetails {
  orderNumber: string;
  status: string;
  statusLabel: string;
  statusHistory: StatusHistoryItem[];
  store: {
    name: string;
    phone?: string;
    logo?: string;
  };
  items: OrderItemDetail[];
  address: {
    fullName: string;
    city: string;
    district?: string;
    street: string;
    fullAddress: string;
  };
  payment: {
    subtotal: number;
    shippingFee: number;
    discount: number;
    total: number;
    currency: string;
  };
  dates: {
    ordered: Date;
    estimatedDelivery?: Date;
    deliveredAt?: Date;
  };
  customerNote?: string;
}

interface StatusHistoryItem {
  status: string;
  label: string;
  date: Date;
  isCurrent: boolean;
}

interface OrderItemDetail {
  name: string;
  nameAr?: string;
  price: number;
  quantity: number;
  subtotal: number;
  image?: string;
}

@Injectable()
export class OrderTrackingService {
  private readonly logger = new Logger(OrderTrackingService.name);
  private readonly bucket = process.env.S3_BUCKET || 'rukny-storage';

  // Prisma helper for new models
  private get prismaAny() {
    return this.prisma as any;
  }

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly whatsappBusiness: WhatsAppBusinessService,
    private readonly s3Service: S3Service,
  ) {}

  /**
   * 📲 طلب OTP للتتبع
   */
  async requestTrackingOtp(dto: TrackingOtpRequest): Promise<{
    success: boolean;
    message: string;
    otpId: string;
    expiresIn: number;
    ordersCount: number;
  }> {
    const { phoneNumber, orderNumber } = dto;

    // 1. التحقق من وجود طلبات لهذا الرقم
    const ordersCount = await this.prismaAny.orders.count({
      where: { phoneNumber },
    });

    if (ordersCount === 0) {
      throw new NotFoundException({
        message: 'لا توجد طلبات مرتبطة بهذا الرقم',
        code: 'NO_ORDERS_FOUND',
      });
    }

    // 2. إذا تم تحديد رقم طلب معين، نتحقق منه
    if (orderNumber) {
      const order = await this.prismaAny.orders.findFirst({
        where: {
          orderNumber,
          phoneNumber,
        },
      });

      if (!order) {
        throw new NotFoundException({
          message: 'رقم الطلب غير موجود أو غير مرتبط بهذا الرقم',
          code: 'ORDER_NOT_FOUND',
        });
      }
    }

    // 3. إلغاء OTPs السابقة
    await this.prismaAny.whatsappOtp.updateMany({
      where: {
        phoneNumber,
        type: 'VERIFICATION',
        verified: false,
        expiresAt: { gt: new Date() },
      },
      data: { expiresAt: new Date() },
    });

    // 4. توليد OTP جديد
    const otpCode = this.generateOtpCode();
    const codeHash = await bcrypt.hash(otpCode, BCRYPT_ROUNDS);

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + OTP_EXPIRY_MINUTES);

    // 5. حفظ OTP
    const otpRecord = await this.prismaAny.whatsappOtp.create({
      data: {
        phoneNumber,
        codeHash,
        type: 'VERIFICATION',
        expiresAt,
      },
    });

    // 6. إرسال OTP عبر واتساب Business API
    try {
      await this.whatsappBusiness.sendOtp(phoneNumber, otpCode);
      this.logger.log(`✅ Tracking OTP sent to ${phoneNumber}`);
    } catch (error) {
      this.logger.error(`Failed to send tracking OTP to ${phoneNumber}: ${(error as Error).message}`);
      throw new BadRequestException({
        message: 'فشل في إرسال رمز التحقق. يرجى المحاولة لاحقاً.',
        code: 'OTP_SEND_FAILED',
      });
    }

    return {
      success: true,
      message: 'تم إرسال رمز التحقق عبر واتساب',
      otpId: otpRecord.id,
      expiresIn: OTP_EXPIRY_MINUTES * 60,
      ordersCount,
    };
  }

  /**
   * ✅ التحقق من OTP وإنشاء جلسة تتبع
   */
  async verifyTrackingOtp(dto: TrackingOtpVerify): Promise<TrackingSession> {
    const { phoneNumber, code, otpId } = dto;

    // 1. جلب OTP
    const otpRecord = await this.prismaAny.whatsappOtp.findUnique({
      where: { id: otpId },
    });

    if (!otpRecord) {
      throw new BadRequestException({
        message: 'رمز التحقق غير صالح',
        code: 'INVALID_OTP_ID',
      });
    }

    // 2. التحققات الأساسية
    if (otpRecord.phoneNumber !== phoneNumber) {
      throw new BadRequestException({
        message: 'رقم الهاتف غير متطابق',
        code: 'PHONE_MISMATCH',
      });
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new BadRequestException({
        message: 'انتهت صلاحية رمز التحقق',
        code: 'OTP_EXPIRED',
      });
    }

    if (otpRecord.verified) {
      throw new BadRequestException({
        message: 'تم استخدام هذا الرمز مسبقاً',
        code: 'OTP_ALREADY_USED',
      });
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      throw new BadRequestException({
        message: 'تم تجاوز الحد الأقصى للمحاولات',
        code: 'MAX_ATTEMPTS_EXCEEDED',
      });
    }

    // 3. زيادة عداد المحاولات
    await this.prismaAny.whatsappOtp.update({
      where: { id: otpId },
      data: { attempts: { increment: 1 } },
    });

    // 4. التحقق من الرمز
    const isValid = await bcrypt.compare(code, otpRecord.codeHash);

    if (!isValid) {
      const remaining = MAX_OTP_ATTEMPTS - (otpRecord.attempts + 1);
      throw new BadRequestException({
        message: `رمز التحقق غير صحيح. المحاولات المتبقية: ${remaining}`,
        code: 'INVALID_OTP_CODE',
        remainingAttempts: remaining,
      });
    }

    // 5. تحديث OTP كمُحقق
    await this.prismaAny.whatsappOtp.update({
      where: { id: otpId },
      data: {
        verified: true,
        verifiedAt: new Date(),
      },
    });

    // 6. جلب الطلبات
    const orders = await this.getOrdersByPhone(phoneNumber);

    // 7. إنشاء JWT للتتبع
    const accessToken = this.jwtService.sign(
      {
        phone: phoneNumber,
        type: 'tracking',
        ordersCount: orders.length,
      },
      { expiresIn: `${TRACKING_SESSION_MINUTES}m` },
    );

    return {
      success: true,
      accessToken,
      expiresIn: TRACKING_SESSION_MINUTES * 60,
      orders,
    };
  }

  /**
   * 📋 جلب قائمة الطلبات برقم الهاتف
   */
  async getOrdersByPhone(phoneNumber: string): Promise<OrderSummary[]> {
    const orders = await this.prismaAny.orders.findMany({
      where: { phoneNumber },
      include: {
        stores: {
          select: { name: true },
        },
        order_items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order: any) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel: this.getStatusLabel(order.status),
      storeName: order.stores?.name || 'متجر',
      total: Number(order.total),
      currency: order.currency,
      itemsCount: order.order_items?.length || 0,
      createdAt: order.createdAt,
      estimatedDelivery: order.estimatedDelivery,
    }));
  }

  /**
   * 📦 جلب تفاصيل طلب معين
   */
  async getOrderDetails(
    orderNumber: string,
    phoneNumber: string,
  ): Promise<OrderDetails> {
    const order = await this.prismaAny.orders.findFirst({
      where: {
        orderNumber,
        phoneNumber,
      },
      include: {
        stores: {
          select: {
            name: true,
            contactPhone: true,
            logo: true,
          },
        },
        addresses: true,
        order_items: {
          include: {
            products: {
              select: {
                name: true,
                nameAr: true,
                product_images: {
                  where: { isPrimary: true },
                  take: 1,
                },
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException({
        message: 'الطلب غير موجود',
        code: 'ORDER_NOT_FOUND',
      });
    }

    return {
      orderNumber: order.orderNumber,
      status: order.status,
      statusLabel: this.getStatusLabel(order.status),
      statusHistory: this.buildStatusHistory(order.status, order.createdAt),
      store: {
        name: order.stores?.name || 'متجر',
        phone: order.stores?.contactPhone,
        logo: order.stores?.logo,
      },
      items: await Promise.all(order.order_items.map(async (item: any) => {
        let image: string | undefined = item.products?.product_images?.[0]?.imagePath;
        if (image && !image.startsWith('http')) {
          image = `/api/media/${image}`;
        }
        return {
          name: item.productName,
          nameAr: item.productNameAr || item.products?.nameAr,
          price: Number(item.price),
          quantity: item.quantity,
          subtotal: Number(item.subtotal),
          image,
        };
      })),
      address: {
        fullName: order.addresses?.fullName || '',
        city: order.addresses?.city || '',
        district: order.addresses?.district,
        street: order.addresses?.street || '',
        fullAddress: this.buildFullAddress(order.addresses),
      },
      payment: {
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shippingFee),
        discount: Number(order.discount),
        total: Number(order.total),
        currency: order.currency,
      },
      dates: {
        ordered: order.createdAt,
        estimatedDelivery: order.estimatedDelivery,
        deliveredAt: order.deliveredAt,
      },
      customerNote: order.customerNote,
    };
  }

  /**
   * 📊 جلب ملخص سريع للطلب (بدون OTP - للعرض العام)
   */
  async getQuickOrderStatus(orderNumber: string): Promise<{
    exists: boolean;
    status?: string;
    statusLabel?: string;
    storeName?: string;
    requiresVerification: boolean;
  }> {
    const order = await this.prismaAny.orders.findUnique({
      where: { orderNumber },
      include: {
        stores: {
          select: { name: true },
        },
      },
    });

    if (!order) {
      return {
        exists: false,
        requiresVerification: false,
      };
    }

    return {
      exists: true,
      status: order.status,
      statusLabel: this.getStatusLabel(order.status),
      storeName: order.stores?.name,
      requiresVerification: true,
    };
  }

  // ============ Helper Methods ============

  /**
   * 🎲 توليد رمز OTP
   */
  private generateOtpCode(): string {
    const buffer = crypto.randomBytes(4);
    const num = buffer.readUInt32BE(0);
    return ((num % 900000) + 100000).toString();
  }

  /**
   * 📝 قالب رسالة OTP للتتبع
   */
  private formatTrackingOtpMessage(code: string, ordersCount: number): string {
    return `📦 تتبع طلباتك من ركني

رمز التحقق: ${code.split('').join(' ')}

⏰ صالح لمدة ${OTP_EXPIRY_MINUTES} دقائق

📋 لديك ${ordersCount} طلب/طلبات مسجلة

━━━━━━━━━━━━━━━
ركني - Rukny.io`;
  }

  /**
   * 🏷️ تسمية الحالة بالعربية
   */
  private getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: '⏳ قيد الانتظار',
      CONFIRMED: '✅ تم التأكيد',
      PROCESSING: '📦 قيد التجهيز',
      SHIPPED: '🚚 تم الشحن',
      OUT_FOR_DELIVERY: '🚗 في الطريق إليك',
      DELIVERED: '✅ تم التسليم',
      CANCELLED: '❌ ملغي',
      REFUNDED: '💰 تم الاسترداد',
    };
    return labels[status] || status;
  }

  /**
   * 📜 بناء سجل الحالات
   */
  private buildStatusHistory(
    currentStatus: string,
    orderDate: Date,
  ): StatusHistoryItem[] {
    const statusFlow = [
      'PENDING',
      'CONFIRMED',
      'PROCESSING',
      'SHIPPED',
      'OUT_FOR_DELIVERY',
      'DELIVERED',
    ];

    const currentIndex = statusFlow.indexOf(currentStatus);

    return statusFlow
      .map((status, index) => ({
        status,
        label: this.getStatusLabel(status)
          .replace(/[^\u0600-\u06FF\s]/g, '')
          .trim(),
        date: index <= currentIndex ? orderDate : new Date(0),
        isCurrent: status === currentStatus,
      }))
      .filter((_, index) => index <= Math.max(currentIndex, 0));
  }

  /**
   * 🏠 بناء العنوان الكامل
   */
  private buildFullAddress(address: any): string {
    if (!address) return '';

    const parts = [
      address.street,
      address.buildingNo ? `مبنى ${address.buildingNo}` : null,
      address.floor ? `طابق ${address.floor}` : null,
      address.district,
      address.city,
    ].filter(Boolean);

    return parts.join('، ');
  }
}

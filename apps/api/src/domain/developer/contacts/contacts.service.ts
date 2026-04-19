import { Injectable, Logger, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../../core/database/prisma/prisma.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { UpdateContactDto } from './dto/update-contact.dto';
import { DEVELOPER_PLAN_LIMITS } from '../subscriptions/dev-plan-limits.config';

@Injectable()
export class ContactsService {
  private readonly logger = new Logger(ContactsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * إنشاء جهة اتصال
   */
  async create(userId: string, dto: CreateContactDto) {
    await this.checkContactLimit(userId);

    // تنسيق رقم الهاتف
    const phoneNumber = this.formatPhoneNumber(dto.phoneNumber);

    // التحقق من التكرار
    const existing = await this.prisma.developerContact.findUnique({
      where: { userId_phoneNumber: { userId, phoneNumber } },
    });

    if (existing) {
      throw new ConflictException('Contact with this phone number already exists');
    }

    return this.prisma.developerContact.create({
      data: {
        userId,
        phoneNumber,
        name: dto.name,
        email: dto.email,
        tags: dto.tags || [],
        customFields: dto.customFields || {},
      },
    });
  }

  /**
   * قائمة جهات الاتصال مع بحث وتصفية
   */
  async findAll(
    userId: string,
    options?: { search?: string; tag?: string; page?: number; limit?: number },
  ) {
    const page = options?.page || 1;
    const limit = Math.min(options?.limit || 20, 100);

    const where: any = { userId };

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { phoneNumber: { contains: options.search } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options?.tag) {
      where.tags = { has: options.tag };
    }

    const [contacts, total] = await this.prisma.$transaction([
      this.prisma.developerContact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.developerContact.count({ where }),
    ]);

    return {
      data: contacts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * تفاصيل جهة اتصال
   */
  async findOne(userId: string, contactId: string) {
    const contact = await this.prisma.developerContact.findFirst({
      where: { id: contactId, userId },
    });
    if (!contact) throw new NotFoundException('Contact not found');
    return contact;
  }

  /**
   * تحديث جهة اتصال
   */
  async update(userId: string, contactId: string, dto: UpdateContactDto) {
    const contact = await this.prisma.developerContact.findFirst({
      where: { id: contactId, userId },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    return this.prisma.developerContact.update({
      where: { id: contactId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.email !== undefined && { email: dto.email }),
        ...(dto.tags && { tags: dto.tags }),
        ...(dto.customFields && { customFields: dto.customFields }),
        ...(dto.isValid !== undefined && { isValid: dto.isValid }),
      },
    });
  }

  /**
   * حذف جهة اتصال
   */
  async remove(userId: string, contactId: string) {
    const contact = await this.prisma.developerContact.findFirst({
      where: { id: contactId, userId },
    });
    if (!contact) throw new NotFoundException('Contact not found');

    await this.prisma.developerContact.delete({ where: { id: contactId } });
    return { success: true };
  }

  /**
   * تنسيق رقم الهاتف
   */
  private formatPhoneNumber(phone: string): string {
    let formatted = phone.replace(/[\s\-\(\)]/g, '');
    if (!formatted.startsWith('+')) {
      formatted = '+' + formatted;
    }
    return formatted;
  }

  /**
   * التحقق من حدود جهات الاتصال
   */
  private async checkContactLimit(userId: string) {
    const subscription = await this.prisma.developerSubscription.findUnique({
      where: { userId },
      select: { plan: true },
    });

    const plan = subscription?.plan || 'FREE';
    const limits = DEVELOPER_PLAN_LIMITS[plan];

    const currentCount = await this.prisma.developerContact.count({
      where: { userId },
    });

    if (currentCount >= limits.maxContacts) {
      throw new ForbiddenException(
        `Contact limit reached (${limits.maxContacts}). Upgrade your plan for more.`,
      );
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface WhatsAppBusinessResult {
  messageId: string;
  status: 'accepted' | 'failed';
}

export interface WhatsAppBusinessOtpResult {
  messageId: string;
  status: 'accepted' | 'failed';
}

/**
 * 📱 خدمة WhatsApp Business API (Meta Cloud API)
 *
 * إرسال رسائل Authentication OTP عبر WhatsApp Business Platform
 * - يستخدم Meta Cloud API v21.0
 * - يدعم Authentication Templates
 * - يدعم One-Time Password buttons
 */
@Injectable()
export class WhatsAppBusinessService {
  private readonly logger = new Logger(WhatsAppBusinessService.name);
  private readonly client: AxiosInstance;
  private readonly phoneNumberId: string;
  private readonly businessAccountId: string;
  private readonly authTemplateName: string;
  private readonly enabled: boolean;

  constructor(private configService: ConfigService) {
    const accessToken = this.configService.get<string>(
      'WHATSAPP_BUSINESS_TOKEN',
      '',
    );
    this.phoneNumberId = this.configService.get<string>(
      'WHATSAPP_PHONE_NUMBER_ID',
      '',
    );
    this.businessAccountId = this.configService.get<string>(
      'WHATSAPP_BUSINESS_ACCOUNT_ID',
      '',
    );
    this.authTemplateName = this.configService.get<string>(
      'WHATSAPP_AUTH_TEMPLATE_NAME',
      'auth_otp',
    );

    this.enabled = !!(accessToken && this.phoneNumberId);

    if (!this.enabled) {
      this.logger.warn(
        '⚠️ WhatsApp Business service disabled - Missing WHATSAPP_BUSINESS_TOKEN or WHATSAPP_PHONE_NUMBER_ID',
      );
    } else {
      this.logger.log('✅ WhatsApp Business service enabled');
    }

    this.client = axios.create({
      baseURL: 'https://graph.facebook.com/v21.0',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 📤 إرسال رمز OTP عبر Authentication Template
   */
  async sendOtp(
    phoneNumber: string,
    otp: string,
  ): Promise<WhatsAppBusinessOtpResult> {
    if (!this.enabled) {
      throw new Error('WhatsApp Business service is not configured');
    }

    const formatted = this.formatPhoneNumber(phoneNumber);

    try {
      this.logger.log(
        `📤 Sending WhatsApp Business OTP to ${this.maskPhone(formatted)}`,
      );

      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formatted,
          type: 'template',
          template: {
            name: this.authTemplateName,
            language: { code: 'ar' },
            components: [
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: otp,
                  },
                ],
              },
              {
                type: 'button',
                sub_type: 'url',
                index: '0',
                parameters: [
                  {
                    type: 'text',
                    text: otp,
                  },
                ],
              },
            ],
          },
        },
      );

      const messageId =
        response.data?.messages?.[0]?.id || response.data?.message_id || '';

      this.logger.log(
        `✅ WhatsApp Business OTP sent: ${messageId}`,
      );

      return { messageId, status: 'accepted' };
    } catch (error) {
      const errorData = error?.response?.data?.error;
      const errorMessage =
        errorData?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Unknown error';
      const errorCode = errorData?.code || error?.response?.status;

      this.logger.error(
        `❌ WhatsApp Business OTP failed: ${errorMessage} (code: ${errorCode})`,
      );

      throw new Error(`فشل إرسال رمز التحقق عبر واتساب: ${errorMessage}`);
    }
  }

  /**
   * 📤 إرسال رسالة نصية مباشرة (بدون Template)
   * ⚠️ يعمل فقط مع الأرقام التي راسلتك خلال 24 ساعة
   */
  async sendTextMessage(
    phoneNumber: string,
    text: string,
  ): Promise<WhatsAppBusinessResult> {
    if (!this.enabled) {
      throw new Error('WhatsApp Business service is not configured');
    }

    const formatted = this.formatPhoneNumber(phoneNumber);

    try {
      const response = await this.client.post(
        `/${this.phoneNumberId}/messages`,
        {
          messaging_product: 'whatsapp',
          to: formatted,
          type: 'text',
          text: { body: text },
        },
      );

      const messageId =
        response.data?.messages?.[0]?.id || '';

      return { messageId, status: 'accepted' };
    } catch (error) {
      const errorMessage =
        error?.response?.data?.error?.message ||
        error?.message ||
        'Unknown error';

      this.logger.error(
        `❌ WhatsApp Business text message failed: ${errorMessage}`,
      );

      throw new Error(`فشل إرسال الرسالة: ${errorMessage}`);
    }
  }

  /**
   * 🔍 فحص حالة الخدمة
   */
  async checkStatus(): Promise<{
    enabled: boolean;
    connected: boolean;
    phoneNumber?: string;
  }> {
    if (!this.enabled) {
      return { enabled: false, connected: false };
    }

    try {
      const response = await this.client.get(
        `/${this.phoneNumberId}?fields=verified_name,display_phone_number,quality_rating`,
      );

      return {
        enabled: true,
        connected: true,
        phoneNumber: response.data?.display_phone_number,
      };
    } catch {
      return { enabled: true, connected: false };
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove spaces, dashes, and + prefix (Meta API expects without +)
    let formatted = phone.replace(/[\s\-()]/g, '');
    if (formatted.startsWith('+')) {
      formatted = formatted.substring(1);
    }
    return formatted;
  }

  private maskPhone(phone: string): string {
    if (phone.length < 8) return '***';
    return phone.slice(0, 5) + '***' + phone.slice(-3);
  }
}

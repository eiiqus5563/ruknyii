import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

/**
 * 🔗 Meta Graph API Service
 *
 * وسيط مركزي لجميع طلبات Meta/Facebook Graph API
 * يُستخدم لـ: WABA, Phone Numbers, Messages, Templates
 */
@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);
  private readonly graphUrl: string;
  private readonly apiVersion: string;
  private readonly appId: string;
  private readonly appSecret: string;

  constructor(private configService: ConfigService) {
    this.graphUrl = 'https://graph.facebook.com';
    this.apiVersion = 'v21.0';
    this.appId = this.configService.get('WHATSAPP_APP_ID', '');
    this.appSecret = this.configService.get('WHATSAPP_APP_SECRET', '');
  }

  /**
   * إنشاء axios client مع access token
   */
  private createClient(accessToken: string): AxiosInstance {
    return axios.create({
      baseURL: `${this.graphUrl}/${this.apiVersion}`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });
  }

  // ==================
  // 📨 Messages
  // ==================

  /**
   * إرسال رسالة عبر Meta Cloud API
   */
  async sendMessage(
    phoneNumberId: string,
    accessToken: string,
    payload: {
      to: string;
      type: string;
      messaging_product: 'whatsapp';
      [key: string]: any;
    },
  ) {
    const client = this.createClient(accessToken);

    try {
      const response = await client.post(`/${phoneNumberId}/messages`, {
        messaging_product: 'whatsapp',
        ...payload,
      });

      this.logger.debug(`Message sent via ${phoneNumberId} to ${payload.to}`);
      return response.data;
    } catch (error) {
      this.logger.error(
        `Failed to send message: ${error.response?.data?.error?.message || error.message}`,
      );
      throw error;
    }
  }

  // ==================
  // 📋 Templates
  // ==================

  /**
   * إنشاء قالب رسالة
   */
  async createTemplate(
    wabaId: string,
    accessToken: string,
    template: {
      name: string;
      language: string;
      category: string;
      components: any[];
    },
  ) {
    const client = this.createClient(accessToken);
    const response = await client.post(`/${wabaId}/message_templates`, template);
    return response.data;
  }

  /**
   * قائمة القوالب
   */
  async listTemplates(wabaId: string, accessToken: string) {
    const client = this.createClient(accessToken);
    const response = await client.get(`/${wabaId}/message_templates`, {
      params: { limit: 100 },
    });
    return response.data;
  }

  /**
   * حذف قالب
   */
  async deleteTemplate(wabaId: string, accessToken: string, templateName: string) {
    const client = this.createClient(accessToken);
    const response = await client.delete(`/${wabaId}/message_templates`, {
      params: { name: templateName },
    });
    return response.data;
  }

  // ==================
  // 📱 WABA & Phone Numbers
  // ==================

  /**
   * جلب معلومات WABA
   */
  async getWabaInfo(wabaId: string, accessToken: string) {
    const client = this.createClient(accessToken);
    const response = await client.get(`/${wabaId}`, {
      params: {
        fields: 'id,name,currency,timezone_id,message_template_namespace,account_review_status',
      },
    });
    return response.data;
  }

  /**
   * جلب أرقام الهاتف لـ WABA
   */
  async getPhoneNumbers(wabaId: string, accessToken: string) {
    const client = this.createClient(accessToken);
    const response = await client.get(`/${wabaId}/phone_numbers`, {
      params: {
        fields:
          'id,display_phone_number,verified_name,quality_rating,messaging_limit_tier,status,name_status,code_verification_status,platform_type,is_official_business_account',
      },
    });
    return response.data;
  }

  /**
   * تسجيل رقم هاتف
   */
  async registerPhoneNumber(
    phoneNumberId: string,
    accessToken: string,
    pin: string,
  ) {
    const client = this.createClient(accessToken);
    const response = await client.post(`/${phoneNumberId}/register`, {
      messaging_product: 'whatsapp',
      pin,
    });
    return response.data;
  }

  /**
   * تحديث بروفايل الرقم
   */
  async updateBusinessProfile(
    phoneNumberId: string,
    accessToken: string,
    profile: {
      about?: string;
      address?: string;
      description?: string;
      email?: string;
      websites?: string[];
      profile_picture_url?: string;
    },
  ) {
    const client = this.createClient(accessToken);
    const response = await client.post(
      `/${phoneNumberId}/whatsapp_business_profile`,
      {
        messaging_product: 'whatsapp',
        ...profile,
      },
    );
    return response.data;
  }

  // ==================
  // 🔔 Webhooks
  // ==================

  /**
   * الاشتراك في أحداث WABA
   */
  async subscribeToWebhooks(wabaId: string, accessToken: string) {
    const client = this.createClient(accessToken);
    const response = await client.post(`/${wabaId}/subscribed_apps`);
    return response.data;
  }

  // ==================
  // 🔄 Token Exchange
  // ==================

  /**
   * تبديل code قصير بـ access token طويل المدة
   * يُستخدم في Embedded Signup callback
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    token_type: string;
  }> {
    const response = await axios.get(`${this.graphUrl}/oauth/access_token`, {
      params: {
        client_id: this.appId,
        client_secret: this.appSecret,
        code,
      },
    });
    return response.data;
  }

  /**
   * Debug token — الحصول على معلومات token
   */
  async debugToken(accessToken: string) {
    const response = await axios.get(`${this.graphUrl}/debug_token`, {
      params: {
        input_token: accessToken,
        access_token: `${this.appId}|${this.appSecret}`,
      },
    });
    return response.data;
  }

  // ==================
  // 📤 Media
  // ==================

  /**
   * رفع ملف وسائط
   */
  async uploadMedia(
    phoneNumberId: string,
    accessToken: string,
    file: Buffer,
    mimeType: string,
    filename: string,
  ) {
    const client = this.createClient(accessToken);
    const formData = new FormData();
    formData.append('messaging_product', 'whatsapp');
    formData.append('file', new Blob([new Uint8Array(file)], { type: mimeType }), filename);
    formData.append('type', mimeType);

    const response = await client.post(`/${phoneNumberId}/media`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }
}

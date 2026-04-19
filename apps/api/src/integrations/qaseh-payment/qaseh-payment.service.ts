/**
 * 💳 Al-Qaseh Payment Gateway Service
 *
 * Handles all communication with Al-Qaseh payment API.
 * Docs: https://docs.alqaseh.com/
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type {
  QasehCreatePaymentParams,
  QasehCreatePaymentResponse,
  QasehPaymentContextResponse,
  QasehRetryPaymentResponse,
  QasehRevokePaymentResponse,
  QasehLimitPaymentInfoResponse,
  QasehUpdateStatusParams,
} from './qaseh-payment.types';

@Injectable()
export class QasehPaymentService {
  private readonly logger = new Logger(QasehPaymentService.name);
  private readonly apiUrl: string;
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUrl: string;
  private readonly webhookUrl: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.get<string>('QASEH_API_URL', 'https://api-test.alqaseh.com/v1');
    this.clientId = this.config.get<string>('QASEH_CLIENT_ID', '');
    this.clientSecret = this.config.get<string>('QASEH_CLIENT_SECRET', '');
    this.redirectUrl = this.config.get<string>('QASEH_REDIRECT_URL', '');
    this.webhookUrl = this.config.get<string>('QASEH_WEBHOOK_URL', '');
  }

  /**
   * Get Basic Auth header value
   */
  private getAuthHeader(): string {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    return `Basic ${credentials}`;
  }

  /**
   * Make authenticated request to Qaseh API
   */
  private async request<T>(
    method: string,
    path: string,
    body?: any,
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: this.getAuthHeader(),
      'Content-Type': 'application/json',
    };

    this.logger.log(`Qaseh API ${method} ${path}`);

    const res = await fetch(url, {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      this.logger.error(`Qaseh API error ${res.status}: ${errorBody}`);
      throw new Error(`Qaseh API error ${res.status}: ${errorBody}`);
    }

    return res.json() as Promise<T>;
  }

  /**
   * Create a new payment context
   * Returns payment_id and token for redirecting user to payment page
   */
  async createPayment(params: {
    orderId: string;
    amount: number;
    currency: string;
    description: string;
    customerEmail?: string;
    customData?: Record<string, any>;
  }): Promise<QasehCreatePaymentResponse> {
    const payload: QasehCreatePaymentParams = {
      amount: params.amount,
      currency: params.currency,
      description: params.description,
      order_id: params.orderId,
      redirect_url: this.redirectUrl,
      transaction_type: 'Retail',
      webhook_url: this.webhookUrl,
      ...(params.customerEmail ? { email: params.customerEmail } : {}),
      ...(params.customData ? { custom_data: params.customData } : {}),
    };

    return this.request<QasehCreatePaymentResponse>(
      'POST',
      '/egw/payments/create',
      payload,
    );
  }

  /**
   * Get full payment context details by payment ID
   */
  async getPaymentContext(paymentId: string): Promise<QasehPaymentContextResponse> {
    return this.request<QasehPaymentContextResponse>(
      'GET',
      `/egw/payments/${paymentId}`,
    );
  }

  /**
   * Get limited payment info by token (amount, currency, status)
   */
  async getPaymentInfo(token: string): Promise<QasehLimitPaymentInfoResponse> {
    return this.request<QasehLimitPaymentInfoResponse>(
      'GET',
      `/egw/payments/info/${token}`,
    );
  }

  /**
   * Retry a failed or expired payment
   */
  async retryPayment(paymentId: string): Promise<QasehRetryPaymentResponse> {
    const payload: QasehUpdateStatusParams = { payment_id: paymentId };
    return this.request<QasehRetryPaymentResponse>(
      'POST',
      '/egw/payments/retry',
      payload,
    );
  }

  /**
   * Revoke a payment before it is processed
   */
  async revokePayment(paymentId: string): Promise<QasehRevokePaymentResponse> {
    const payload: QasehUpdateStatusParams = { payment_id: paymentId };
    return this.request<QasehRevokePaymentResponse>(
      'POST',
      '/egw/payments/revoke',
      payload,
    );
  }

  /**
   * Process reversal of a completed payment
   */
  async processReversal(token: string): Promise<string> {
    return this.request<string>(
      'POST',
      `/egw/payments/process-reversal/${token}`,
    );
  }

  /**
   * Build the Qaseh hosted payment page URL for customer redirect
   * Non-certified merchants redirect customers to this page
   * Test: https://pay-test.alqaseh.com/pay/:token
   * Production: https://pay.alqaseh.com/pay/:token
   */
  getPaymentPageUrl(token: string): string {
    // Derive pay domain from API URL
    // api-test.alqaseh.com → pay-test.alqaseh.com
    // api.alqaseh.com → pay.alqaseh.com
    const payDomain = this.apiUrl
      .replace('://api-test.', '://pay-test.')
      .replace('://api.', '://pay.')
      .replace(/\/v1\/?$/, '');
    return `${payDomain}/pay/${token}`;
  }

  /**
   * Check if Qaseh is configured
   */
  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret && this.apiUrl);
  }
}

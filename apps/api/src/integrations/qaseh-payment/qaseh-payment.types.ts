/**
 * 💳 Al-Qaseh Payment Gateway - Types
 */

// ─── Request Types ───────────────────────────────────────────────────────────

export interface QasehCreatePaymentParams {
  amount: number;
  currency: string;
  description: string;
  order_id: string;
  redirect_url: string;
  transaction_type: 'Retail' | 'Authorization' | 'Reversal' | 'CompleteSales';
  webhook_url?: string;
  email?: string;
  custom_data?: Record<string, any>;
}

export interface QasehUpdateStatusParams {
  payment_id: string;
  details?: string;
}

// ─── Response Types ──────────────────────────────────────────────────────────

export interface QasehCreatePaymentResponse {
  payment_id: string;
  token: string;
}

export interface QasehPaymentContextResponse {
  id: number;
  payment_id: string;
  token: string;
  order_id: string;
  amount: number;
  currency: string;
  description: string;
  payment_status: QasehPaymentStatus;
  transaction_type: string;
  redirect_url: string;
  webhook_url: string;
  approval_code: string;
  rc: string;
  rrn: string;
  merchant_email: string;
  merchant_id: number;
  country: string;
  custom_data: Record<string, any>;
  created_at: string;
  updated_at: string;
  deleted_at: string;
  nonce: string;
  p_sign: string;
  gmt: string;
  timestamp: string;
  terminal_id: string;
  payment_status_histories?: QasehPaymentStatusHistory[];
}

export interface QasehPaymentStatusHistory {
  status: string;
  created_at: string;
}

export interface QasehLimitPaymentInfoResponse {
  amount: number;
  currency: string;
  description: string;
  payment_status: QasehPaymentStatus;
}

export interface QasehRetryPaymentResponse {
  payment_id: string;
  payment_status: QasehPaymentStatus;
  token: string;
}

export interface QasehRevokePaymentResponse {
  payment_id: string;
  order_id: string;
  amount: number;
  currency: string;
  payment_status: QasehPaymentStatus;
  custom_data: Record<string, any>;
}

export interface QasehErrorResponse {
  err: string;
  error_code: string;
  reference_code: string;
}

// ─── Enums ───────────────────────────────────────────────────────────────────

export type QasehPaymentStatus =
  | 'prepared'
  | 'revoked'
  | 'failed'
  | 'retried'
  | 'succeeded'
  | 'expired'
  | 'duplicated'
  | 'declined'
  | 'unknown';

export type QasehTransactionType =
  | 'Retail'
  | 'Authorization'
  | 'Reversal'
  | 'CompleteSales';

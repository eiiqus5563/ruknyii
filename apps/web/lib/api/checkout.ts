/**
 * 🛒 Checkout API - Guest checkout endpoints
 * Handles OTP auth, address creation, and order placement for guests.
 */

import { API_URL } from '@/lib/config';
import { getCheckoutToken } from '@/lib/cart-store';
import type { CartItem } from '@/lib/cart-store';

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function checkoutFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const t = token ?? getCheckoutToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(t ? { Authorization: `Bearer ${t}` } : {}),
    ...((options.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      msg = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? msg);
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }

  return res.json() as Promise<T>;
}

// ─── OTP Auth ────────────────────────────────────────────────────────────────

export interface RequestOtpResponse {
  success: boolean;
  otpId: string;
  sentVia: 'WHATSAPP' | 'EMAIL';
  message: string;
  expiresIn: number;
  maskedPhone?: string;
}

export async function requestCheckoutOtp(
  phoneNumber: string,
  email?: string,
  preferEmail?: boolean,
): Promise<RequestOtpResponse> {
  return checkoutFetch<RequestOtpResponse>('/auth/checkout/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, ...(email ? { email } : {}), ...(preferEmail ? { preferEmail } : {}) }),
  });
}

export interface VerifyOtpResponse {
  success: boolean;
  accessToken: string;
  userId: string;
  isNewUser: boolean;
  message: string;
}

export async function verifyCheckoutOtp(
  phoneNumber: string,
  code: string,
  otpId: string,
): Promise<VerifyOtpResponse> {
  return checkoutFetch<VerifyOtpResponse>('/auth/checkout/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, code, otpId }),
  });
}

export async function resendCheckoutOtp(phoneNumber: string): Promise<RequestOtpResponse> {
  return checkoutFetch<RequestOtpResponse>('/auth/checkout/resend-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
}

// ─── Quick Login (no OTP) ────────────────────────────────────────────────────

export async function quickCheckoutLogin(
  phoneNumber: string,
  fullName: string,
): Promise<VerifyOtpResponse> {
  return checkoutFetch<VerifyOtpResponse>('/auth/checkout/quick-login', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, fullName }),
  });
}

// ─── Addresses ───────────────────────────────────────────────────────────────

export interface CreateAddressPayload {
  label: string;
  fullName: string;
  phoneNumber: string;
  city: string;
  district?: string;
  street: string;
  buildingNo?: string;
  landmark?: string;
}

export interface AddressResponse {
  id?: string;
  message?: string;
  address?: {
    id: string;
    label: string;
    fullName: string;
    phoneNumber: string;
    city: string;
    district?: string;
    street: string;
    buildingNo?: string;
    landmark?: string;
  };
  label?: string;
  fullName?: string;
  phoneNumber?: string;
  city?: string;
  district?: string;
  street?: string;
  buildingNo?: string;
  landmark?: string;
}

export async function createCheckoutAddress(
  payload: CreateAddressPayload & { phoneNumber: string },
  token: string,
): Promise<AddressResponse> {
  return checkoutFetch<AddressResponse>(
    '/checkout/addresses',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export interface CreateCheckoutOrderPayload {
  storeId: string;
  items: { productId: string; quantity: number; price: number; variantId?: string }[];
  shippingAddressId?: string;
  phoneNumber?: string;
  notes?: string;
}

export interface CheckoutOrderResult {
  success: boolean;
  message: string;
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    total: number;
    currency: string;
    downloadTokens?: Array<{
      token: string;
      productName: string;
      maxDownloads: number;
      expiresAt: string | null;
    }>;
  }>;
}

export async function createCheckoutOrder(
  payload: CreateCheckoutOrderPayload,
  token: string,
): Promise<CheckoutOrderResult> {
  return checkoutFetch<CheckoutOrderResult>(
    '/checkout/orders',
    { method: 'POST', body: JSON.stringify(payload) },
    token,
  );
}

// ─── Order Tracking (public, no token needed) ────────────────────────────────

export interface TrackOrderResponse {
  orderNumber: string;
  status: string;
  total: number;
  currency: string;
  createdAt: string;
  estimatedDelivery?: string;
  deliveredAt?: string;
  items: Array<{ productName: string; quantity: number; price: number }>;
  store: { name: string };
  address: { city: string; district?: string };
}

export async function trackOrder(
  orderNumber: string,
  phoneLast4: string,
): Promise<TrackOrderResponse> {
  return checkoutFetch<TrackOrderResponse>('/orders/track', {
    method: 'POST',
    body: JSON.stringify({ orderNumber, phoneLast4 }),
  });
}

// ─── Order Tracking via OTP ──────────────────────────────────────────────────

export interface TrackingOtpResponse {
  success: boolean;
  message: string;
  otpId: string;
  expiresIn: number;
  ordersCount: number;
}

export interface TrackingVerifyResponse {
  success: boolean;
  accessToken: string;
  expiresIn: number;
  orders: TrackingOrderSummary[];
}

export interface TrackingOrderSummary {
  orderNumber: string;
  status: string;
  statusLabel: string;
  storeName: string;
  total: number;
  currency: string;
  itemsCount: number;
  createdAt: string;
  estimatedDelivery?: string;
}

export interface TrackingOrderDetails {
  orderNumber: string;
  status: string;
  statusLabel: string;
  statusHistory: { status: string; label: string; date: string; isCurrent: boolean }[];
  store: { name: string; phone?: string; logo?: string };
  items: { name: string; nameAr?: string; price: number; quantity: number; subtotal: number; image?: string }[];
  address: { fullName: string; city: string; district?: string; street: string; fullAddress: string };
  payment: { subtotal: number; shippingFee: number; discount: number; total: number; currency: string };
  dates: { ordered: string; estimatedDelivery?: string; deliveredAt?: string };
  customerNote?: string;
}

export async function requestTrackingOtp(
  phoneNumber: string,
  orderNumber?: string,
): Promise<TrackingOtpResponse> {
  return checkoutFetch<TrackingOtpResponse>('/track/request-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, ...(orderNumber ? { orderNumber } : {}) }),
  });
}

export async function verifyTrackingOtp(
  phoneNumber: string,
  code: string,
  otpId: string,
): Promise<TrackingVerifyResponse> {
  return checkoutFetch<TrackingVerifyResponse>('/track/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, code, otpId }),
  });
}

export async function getTrackingOrderDetails(
  orderNumber: string,
  phoneNumber: string,
): Promise<TrackingOrderDetails> {
  return checkoutFetch<TrackingOrderDetails>(`/track/order/${orderNumber}`, {
    method: 'POST',
    body: JSON.stringify({ phoneNumber }),
  });
}

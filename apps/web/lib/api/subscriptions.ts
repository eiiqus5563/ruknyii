/**
 * 💎 Subscriptions API - Plan management & billing endpoints
 */

import api from './client';

// ============ Types ============

export type SubscriptionPlan = 'FREE' | 'PRO' | 'WHALE' | 'BUSINESS';
export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAST_DUE';
export type BillingCycle = 'MONTHLY' | 'YEARLY';

export interface PlanLimits {
  links: number;
  linkGroups: number;
  coverPhoto: boolean;
  heroCustomization: boolean;
  removeWatermark: boolean;
  customShortLinks: boolean;
  linkAnimations: boolean;
  bulkOperations: boolean;
  customQr: boolean;
  forms: number;
  fieldsPerForm: number;
  submissionsPerMonth: number;
  formCoverImage: boolean;
  formMultiSlider: boolean;
  multiStepForms: boolean;
  conditionalLogic: false | 'basic' | 'advanced' | 'full';
  googleSheets: boolean;
  googleDrive: boolean;
  webhook: boolean;
  formAnalytics: false | 'basic' | 'advanced' | 'full';
  store: boolean;
  products: number;
  ordersPerMonth: number;
  imagesPerProduct: number;
  categories: number;
  coupons: number;
  wishlist: boolean;
  productReviews: boolean;
  featuredProducts: boolean;
  digitalProducts: boolean;
  bilingualProducts: boolean;
  storeAnalytics: false | 'basic' | 'advanced' | 'full';
  postsPerDay: number;
  analyticsRetentionDays: number;
  analyticsDevices: boolean;
  analyticsCountries: false | number | 'all';
  analyticsReferrers: boolean;
  analyticsPeriodComparison: boolean;
  analyticsExport: false | 'csv' | 'csv+pdf';
  integrationInstagram: boolean;
  integrationYoutube: false | 'single' | 'all';
  integrationLinkedin: false | 'card' | 'card+post';
  integrationGoogleCalendar: boolean;
  integrationGoogleAnalytics: boolean;
  integrationTelegram: boolean;
  storageBytes: number;
  maxSessions: number;
  twoFactorAuth: boolean;
  securityLog: false | number | 'full';
  anomalyDetection: boolean;
  trustedDevices: boolean;
  ipBlocking: boolean;
  pushNotifications: boolean;
  whatsappCustomerNotifications: boolean;
  telegramNotifications: boolean;
  supportResponseHours: number;
}

export interface SubscriptionDetails {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelledAt: string | null;
  limits: PlanLimits;
}

export interface UsageItem {
  used: number;
  limit: number;
}

export interface UsageSummary {
  plan: SubscriptionPlan;
  usage: {
    links: UsageItem;
    forms: UsageItem;
    submissionsThisMonth: UsageItem;
    products: UsageItem;
    categories: UsageItem;
    coupons: UsageItem;
    linkGroups: UsageItem;
    storage: UsageItem;
    sessions: UsageItem;
    postsToday: UsageItem;
  };
}

export interface PlanPrice {
  monthly: number;
  yearly: number;
}

export interface PlanOverviewItem {
  id: SubscriptionPlan;
  name: string;
  nameEn: string;
  price: PlanPrice;
  limits: PlanLimits;
}

export interface PlansOverviewResponse {
  plans: PlanOverviewItem[];
}

// ============ API Functions ============

/**
 * Get all plans overview (public)
 */
export async function getPlansOverview(): Promise<PlansOverviewResponse> {
  const { data } = await api.get<PlansOverviewResponse>('/subscriptions/plans');
  return data;
}

/**
 * Get my subscription details
 */
export async function getMySubscription(): Promise<SubscriptionDetails> {
  const { data } = await api.get<SubscriptionDetails>('/subscriptions/me');
  return data;
}

/**
 * Get my usage summary
 */
export async function getMyUsage(): Promise<UsageSummary> {
  const { data } = await api.get<UsageSummary>('/subscriptions/me/usage');
  return data;
}

/**
 * Upgrade plan
 */
export async function upgradePlan(plan: SubscriptionPlan, billingCycle: BillingCycle) {
  const { data } = await api.post('/subscriptions/upgrade', { plan, billingCycle });
  return data;
}

/**
 * Cancel subscription
 */
export async function cancelSubscription() {
  const { data } = await api.post('/subscriptions/cancel');
  return data;
}

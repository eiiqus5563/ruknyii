import { SubscriptionPlan } from '@prisma/client';

/**
 * 📦 حدود كل باقة اشتراك
 *
 * Infinity = غير محدود
 * false    = غير متاح
 * true     = متاح
 * string   = مستوى الميزة ('basic' | 'advanced' | 'full')
 */
export interface PlanLimits {
  // === الروابط ===
  links: number;
  linkGroups: number;
  coverPhoto: boolean;
  heroCustomization: boolean;
  removeWatermark: boolean;
  customShortLinks: boolean;
  linkAnimations: boolean;
  bulkOperations: boolean;
  customQr: boolean;

  // === النماذج ===
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

  // === المتجر ===
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

  // === الشبكة الاجتماعية ===
  postsPerDay: number;

  // === التحليلات ===
  analyticsRetentionDays: number;
  analyticsDevices: boolean;
  analyticsCountries: false | number | 'all';
  analyticsReferrers: boolean;
  analyticsPeriodComparison: boolean;
  analyticsExport: false | 'csv' | 'csv+pdf';

  // === التكاملات ===
  integrationInstagram: boolean;
  integrationYoutube: false | 'single' | 'all';
  integrationLinkedin: false | 'card' | 'card+post';
  integrationGoogleCalendar: boolean;
  integrationGoogleAnalytics: boolean;
  integrationTelegram: boolean;

  // === التخزين ===
  storageBytes: number;

  // === الأمان ===
  maxSessions: number;
  twoFactorAuth: boolean;
  securityLog: false | number | 'full';
  anomalyDetection: boolean;
  trustedDevices: boolean;
  ipBlocking: boolean;

  // === الإشعارات ===
  pushNotifications: boolean;
  whatsappCustomerNotifications: boolean;
  telegramNotifications: boolean;

  // === الدعم ===
  supportResponseHours: number;
}

const GB = 1024 * 1024 * 1024;

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  FREE: {
    // الروابط
    links: Infinity,
    linkGroups: 0,
    coverPhoto: false,
    heroCustomization: false,
    removeWatermark: false,
    customShortLinks: false,
    linkAnimations: false,
    bulkOperations: false,
    customQr: false,

    // النماذج
    forms: Infinity,
    fieldsPerForm: Infinity,
    submissionsPerMonth: Infinity,
    formCoverImage: true,
    formMultiSlider: false,
    multiStepForms: false,
    conditionalLogic: false,
    googleSheets: false,
    googleDrive: false,
    webhook: false,
    formAnalytics: false,

    // المتجر
    store: true,
    products: Infinity,
    ordersPerMonth: Infinity,
    imagesPerProduct: 3,
    categories: 5,
    coupons: 0,
    wishlist: false,
    productReviews: false,
    featuredProducts: false,
    digitalProducts: false,
    bilingualProducts: false,
    storeAnalytics: false,

    // الشبكة الاجتماعية
    postsPerDay: 5,

    // التحليلات
    analyticsRetentionDays: 7,
    analyticsDevices: false,
    analyticsCountries: false,
    analyticsReferrers: false,
    analyticsPeriodComparison: false,
    analyticsExport: false,

    // التكاملات
    integrationInstagram: false,
    integrationYoutube: false,
    integrationLinkedin: false,
    integrationGoogleCalendar: false,
    integrationGoogleAnalytics: false,
    integrationTelegram: false,

    // التخزين
    storageBytes: 1 * GB,

    // الأمان
    maxSessions: 3,
    twoFactorAuth: true,
    securityLog: false,
    anomalyDetection: false,
    trustedDevices: false,
    ipBlocking: false,

    // الإشعارات
    pushNotifications: true,
    whatsappCustomerNotifications: true,
    telegramNotifications: false,

    // الدعم
    supportResponseHours: 48,
  },

  PRO: {
    // الروابط
    links: Infinity,
    linkGroups: 10,
    coverPhoto: true,
    heroCustomization: true,
    removeWatermark: true,
    customShortLinks: false,
    linkAnimations: true,
    bulkOperations: true,
    customQr: true,

    // النماذج
    forms: Infinity,
    fieldsPerForm: Infinity,
    submissionsPerMonth: Infinity,
    formCoverImage: true,
    formMultiSlider: true,
    multiStepForms: true,
    conditionalLogic: 'basic',
    googleSheets: false,
    googleDrive: false,
    webhook: false,
    formAnalytics: 'basic',

    // المتجر
    store: true,
    products: Infinity,
    ordersPerMonth: Infinity,
    imagesPerProduct: 8,
    categories: 15,
    coupons: 5,
    wishlist: true,
    productReviews: true,
    featuredProducts: true,
    digitalProducts: false,
    bilingualProducts: false,
    storeAnalytics: 'basic',

    // الشبكة الاجتماعية
    postsPerDay: Infinity,

    // التحليلات
    analyticsRetentionDays: 30,
    analyticsDevices: true,
    analyticsCountries: 5,
    analyticsReferrers: false,
    analyticsPeriodComparison: false,
    analyticsExport: false,

    // التكاملات
    integrationInstagram: true,
    integrationYoutube: 'single',
    integrationLinkedin: false,
    integrationGoogleCalendar: false,
    integrationGoogleAnalytics: false,
    integrationTelegram: false,

    // التخزين
    storageBytes: 3 * GB,

    // الأمان
    maxSessions: 5,
    twoFactorAuth: true,
    securityLog: 30,
    anomalyDetection: false,
    trustedDevices: false,
    ipBlocking: false,

    // الإشعارات
    pushNotifications: true,
    whatsappCustomerNotifications: true,
    telegramNotifications: false,

    // الدعم
    supportResponseHours: 24,
  },

  WHALE: {
    // الروابط
    links: Infinity,
    linkGroups: Infinity,
    coverPhoto: true,
    heroCustomization: true,
    removeWatermark: true,
    customShortLinks: true,
    linkAnimations: true,
    bulkOperations: true,
    customQr: true,

    // النماذج
    forms: Infinity,
    fieldsPerForm: Infinity,
    submissionsPerMonth: Infinity,
    formCoverImage: true,
    formMultiSlider: true,
    multiStepForms: true,
    conditionalLogic: 'advanced',
    googleSheets: true,
    googleDrive: true,
    webhook: true,
    formAnalytics: 'advanced',

    // المتجر
    store: true,
    products: Infinity,
    ordersPerMonth: Infinity,
    imagesPerProduct: Infinity,
    categories: Infinity,
    coupons: Infinity,
    wishlist: true,
    productReviews: true,
    featuredProducts: true,
    digitalProducts: true,
    bilingualProducts: true,
    storeAnalytics: 'advanced',

    // الشبكة الاجتماعية
    postsPerDay: Infinity,

    // التحليلات
    analyticsRetentionDays: 90,
    analyticsDevices: true,
    analyticsCountries: 8,
    analyticsReferrers: true,
    analyticsPeriodComparison: false,
    analyticsExport: 'csv',

    // التكاملات
    integrationInstagram: true,
    integrationYoutube: 'all',
    integrationLinkedin: 'card',
    integrationGoogleCalendar: true,
    integrationGoogleAnalytics: false,
    integrationTelegram: false,

    // التخزين
    storageBytes: 7 * GB,

    // الأمان
    maxSessions: 10,
    twoFactorAuth: true,
    securityLog: 'full',
    anomalyDetection: true,
    trustedDevices: true,
    ipBlocking: false,

    // الإشعارات
    pushNotifications: true,
    whatsappCustomerNotifications: true,
    telegramNotifications: false,

    // الدعم
    supportResponseHours: 12,
  },

  BUSINESS: {
    // الروابط
    links: Infinity,
    linkGroups: Infinity,
    coverPhoto: true,
    heroCustomization: true,
    removeWatermark: true,
    customShortLinks: true,
    linkAnimations: true,
    bulkOperations: true,
    customQr: true,

    // النماذج
    forms: Infinity,
    fieldsPerForm: Infinity,
    submissionsPerMonth: Infinity,
    formCoverImage: true,
    formMultiSlider: true,
    multiStepForms: true,
    conditionalLogic: 'full',
    googleSheets: true,
    googleDrive: true,
    webhook: true,
    formAnalytics: 'full',

    // المتجر
    store: true,
    products: Infinity,
    ordersPerMonth: Infinity,
    imagesPerProduct: Infinity,
    categories: Infinity,
    coupons: Infinity,
    wishlist: true,
    productReviews: true,
    featuredProducts: true,
    digitalProducts: true,
    bilingualProducts: true,
    storeAnalytics: 'full',

    // الشبكة الاجتماعية
    postsPerDay: Infinity,

    // التحليلات
    analyticsRetentionDays: Infinity,
    analyticsDevices: true,
    analyticsCountries: 'all',
    analyticsReferrers: true,
    analyticsPeriodComparison: true,
    analyticsExport: 'csv+pdf',

    // التكاملات
    integrationInstagram: true,
    integrationYoutube: 'all',
    integrationLinkedin: 'card+post',
    integrationGoogleCalendar: true,
    integrationGoogleAnalytics: true,
    integrationTelegram: true,

    // التخزين
    storageBytes: 15 * GB,

    // الأمان
    maxSessions: Infinity,
    twoFactorAuth: true,
    securityLog: 'full',
    anomalyDetection: true,
    trustedDevices: true,
    ipBlocking: true,

    // الإشعارات
    pushNotifications: true,
    whatsappCustomerNotifications: true,
    telegramNotifications: true,

    // الدعم
    supportResponseHours: 4,
  },
};

/**
 * أسعار الباقات بالدينار العراقي
 */
export const PLAN_PRICES: Record<
  Exclude<SubscriptionPlan, 'FREE'>,
  { monthly: number; yearly: number }
> = {
  PRO: { monthly: 15_000, yearly: 144_000 },
  WHALE: { monthly: 25_000, yearly: 240_000 },
  BUSINESS: { monthly: 40_000, yearly: 384_000 },
};

/**
 * ترتيب الباقات (للمقارنة: هل الباقة الجديدة أعلى أم أقل؟)
 */
export const PLAN_ORDER: Record<SubscriptionPlan, number> = {
  FREE: 0,
  PRO: 1,
  WHALE: 2,
  BUSINESS: 3,
};

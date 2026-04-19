# 🖥️ خطة عمل Frontend — بوابة المطوّرين (developers.rukny.io)

> خطة تنفيذية تفصيلية لتحويل بوابة المطوّرين من واجهة ثابتة (Static Demo) إلى منصة ديناميكية كاملة لإدارة WhatsApp Business API

> **التاريخ:** أبريل 2026  
> **المرجع:** [WHATSAPP_TECH_PROVIDER_PLAN.md](./WHATSAPP_TECH_PROVIDER_PLAN.md)

---

## 📑 فهرس المحتويات

1. [تحليل الوضع الحالي للـ Frontend](#1-تحليل-الوضع-الحالي-للـ-frontend)
2. [البنية المعمارية الجديدة](#2-البنية-المعمارية-الجديدة)
3. [طبقة API Client — الاتصال بالـ Backend](#3-طبقة-api-client--الاتصال-بالـ-backend)
4. [نظام إدارة الحالة (State Management)](#4-نظام-إدارة-الحالة-state-management)
5. [إعادة هيكلة الصفحات الحالية](#5-إعادة-هيكلة-الصفحات-الحالية)
6. [الصفحات الجديدة](#6-الصفحات-الجديدة)
7. [المكوّنات المشتركة الجديدة](#7-المكوّنات-المشتركة-الجديدة)
8. [نظام Embedded Signup (ربط WhatsApp)](#8-نظام-embedded-signup-ربط-whatsapp)
9. [نظام المحفظة (Wallet System)](#9-نظام-المحفظة-wallet-system)
10. [التوثيق التفاعلي (Interactive Docs)](#10-التوثيق-التفاعلي-interactive-docs)
11. [تحسينات UX/UI](#11-تحسينات-uxui)
12. [هيكل الملفات النهائي](#12-هيكل-الملفات-النهائي)
13. [مراحل التنفيذ التفصيلية](#13-مراحل-التنفيذ-التفصيلية)
14. [المهام الدقيقة (Task Breakdown)](#14-المهام-الدقيقة-task-breakdown)

---

## 1. تحليل الوضع الحالي للـ Frontend

### 1.1 ما هو موجود ويعمل

| المكوّن | الحالة | الملاحظات |
|---------|--------|-----------|
| **نظام Auth كامل** | ✅ يعمل | Magic Link + Google/LinkedIn OAuth + 2FA |
| **BFF Proxy (auth)** | ✅ يعمل | `app/api/auth/[...path]/route.ts` — rate limiting + cookie forwarding |
| **API Client** | ✅ يعمل | CSRF + refresh mutex + silent refresh + 401 auto-retry |
| **Auth Provider** | ✅ يعمل | State machine كامل: init → refresh → ready |
| **Sidebar** | ✅ يعمل | Collapsible + mobile drawer + collapsed tooltips + dropdown |
| **Dashboard Nav** | ✅ يعمل | Breadcrumbs + user dropdown + back button |
| **Activity Panel** | ✅ يعمل | Notifications + filters + mobile bottom sheet |
| **Welcome Banner** | ✅ يعمل | Dismissible + localStorage persistence |
| **22 Shadcn Components** | ✅ يعمل | avatar, badge, button, card, dialog, dropdown, input, etc. |
| **RTL Arabic UI** | ✅ يعمل | IBM Plex Sans Arabic + dir="rtl" |
| **Light/Dark Theme** | ✅ يعمل | oklch color system |

### 1.2 ما هو ثابت (Static Demo) ويحتاج تحويل

| الصفحة | الملف | البيانات الحالية |
|--------|-------|------------------|
| **Dashboard** | `dashboard/page.tsx` | أرقام ثابتة: 12,847 طلب، 3,291 رسالة، 4 مفاتيح |
| **API Keys** | `dashboard/api-keys/page.tsx` | 3 مفاتيح ثابتة (DEMO_KEYS) |
| **WhatsApp Send** | `dashboard/whatsapp/send/page.tsx` | `setTimeout(1500)` — لا إرسال حقيقي |
| **Templates** | `dashboard/whatsapp/templates/page.tsx` | 4 قوالب ثابتة (DEMO_TEMPLATES) |
| **Contacts** | `dashboard/whatsapp/contacts/page.tsx` | 5 جهات اتصال ثابتة (DEMO_CONTACTS) |
| **Webhooks** | `dashboard/whatsapp/webhooks/page.tsx` | 2 webhook ثابتين (DEMO_WEBHOOKS) |
| **Logs** | `dashboard/whatsapp/logs/page.tsx` | 8 سجلات ثابتة (DEMO_LOGS) |
| **Usage** | `dashboard/usage/page.tsx` | أرقام ثابتة في UsageBar |
| **Billing** | `dashboard/billing/page.tsx` | 3 خطط ثابتة + 3 فواتير ثابتة |
| **Docs** | `dashboard/docs/page.tsx` | روابط # غير تفاعلية |
| **Activity Panel** | `components/dashboard/activity-panel.tsx` | 5 إشعارات ثابتة (INITIAL_NOTIFICATIONS) |

### 1.3 ما هو مفقود تماماً

| المكوّن | الأهمية |
|---------|---------|
| BFF Proxy للـ Developer APIs | 🔴 حرجة |
| صفحة ربط WhatsApp Business (Embedded Signup) | 🔴 حرجة |
| صفحة إدارة الحسابات والأرقام (WABA) | 🔴 حرجة |
| Dialog إنشاء API Key | 🔴 حرجة |
| React Query hooks لكل endpoint | 🔴 حرجة |
| API client functions للـ developer endpoints | 🔴 حرجة |
| صفحة إنشاء قالب جديد | 🟡 عالية |
| Dialog إنشاء/تعديل Webhook | 🟡 عالية |
| Dialog إنشاء/تعديل Contact | 🟡 عالية |
| نظام المحفظة (صفحة + شحن + سجل معاملات + شحن تلقائي) | 🔴 حرجة |
| صفحة Quick Start تفاعلية | 🟡 عالية |
| صفحة API Reference تفاعلية | 🟢 متوسطة |
| صفحة Webhook Events docs | 🟢 متوسطة |
| نظام Real-time notifications | 🟢 متوسطة |
| Sandbox/Test Mode toggle | 🔵 منخفضة |

---

## 2. البنية المعمارية الجديدة

### 2.1 مخطط تدفق البيانات

```
┌──────────────────────────────────────────────────────────┐
│                    React Components                       │
│  (Pages + Components)                                    │
│                                                          │
│  useApiKeys()  useWaba()  useMessages()  useWallet()    │
│       │           │           │             │            │
│       ▼           ▼           ▼             ▼            │
│  ┌──────────────────────────────────────────────────┐    │
│  │           React Query (TanStack Query)           │    │
│  │                                                  │    │
│  │  queryClient.invalidateQueries()                 │    │
│  │  staleTime: 60s │ gcTime: 5min                   │    │
│  │  retry: 1                                        │    │
│  └──────────────┬───────────────────────────────────┘    │
│                 │                                        │
│                 ▼                                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │         API Client Layer (lib/api/)              │    │
│  │                                                  │    │
│  │  developer.ts → /api/developer/*                 │    │
│  │  whatsapp.ts  → /api/developer/whatsapp/*        │    │
│  │  wallet.ts    → /api/developer/wallet/*          │    │
│  │  auth.ts      → /api/auth/* (موجود)              │    │
│  └──────────────┬───────────────────────────────────┘    │
│                 │                                        │
│                 ▼                                        │
│  ┌──────────────────────────────────────────────────┐    │
│  │         BFF Proxy Layer (Next.js API Routes)     │    │
│  │                                                  │    │
│  │  /api/auth/[...path]      → (موجود)              │    │
│  │  /api/developer/[...path] → (جديد)               │    │
│  └──────────────┬───────────────────────────────────┘    │
└─────────────────┼────────────────────────────────────────┘
                  │ HTTP (internal)
                  ▼
┌──────────────────────────────────────────────────────────┐
│              NestJS Backend (api.rukny.io)                │
│                                                          │
│  /api/v1/developer/*        (JWT Auth)                   │
│  /v1/whatsapp/*             (API Key Auth)               │
└──────────────────────────────────────────────────────────┘
```

### 2.2 هيكل المجلدات المستهدف

```
apps/developers/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   │
│   ├── (auth)/                              ← بدون تغيير
│   │   └── ...
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                       ← بدون تغيير
│   │   └── dashboard/
│   │       ├── page.tsx                     ← ✏️ ديناميكي
│   │       ├── api-keys/
│   │       │   └── page.tsx                 ← ✏️ ديناميكي + dialog
│   │       ├── whatsapp/
│   │       │   ├── page.tsx                 ← ✏️ نظرة عامة + ربط WABA
│   │       │   ├── accounts/
│   │       │   │   └── page.tsx             ← 🆕
│   │       │   ├── send/
│   │       │   │   └── page.tsx             ← ✏️ إرسال حقيقي
│   │       │   ├── templates/
│   │       │   │   ├── page.tsx             ← ✏️ ديناميكي
│   │       │   │   └── create/
│   │       │   │       └── page.tsx         ← 🆕
│   │       │   ├── contacts/
│   │       │   │   └── page.tsx             ← ✏️ ديناميكي + dialog
│   │       │   ├── webhooks/
│   │       │   │   └── page.tsx             ← ✏️ ديناميكي + dialog
│   │       │   └── logs/
│   │       │       └── page.tsx             ← ✏️ ديناميكي + filters
│   │       ├── usage/
│   │       │   └── page.tsx                 ← ✏️ ديناميكي
│   │       ├── wallet/
│   │       │   └── page.tsx                 ← 🆕 المحفظة
│   │       ├── billing/
│   │       │   └── page.tsx                 ← ✏️ ديناميكي
│   │       └── docs/
│   │           ├── page.tsx                 ← ✏️ محدّث
│   │           ├── quick-start/
│   │           │   └── page.tsx             ← 🆕
│   │           ├── api-reference/
│   │           │   └── page.tsx             ← 🆕
│   │           └── webhooks/
│   │               └── page.tsx             ← 🆕
│   │
│   └── api/
│       ├── auth/[...path]/route.ts          ← بدون تغيير
│       └── developer/[...path]/route.ts     ← 🆕 BFF Proxy
│
├── components/
│   ├── icons.tsx                             ← بدون تغيير
│   ├── dashboard/
│   │   ├── sidebar.tsx                      ← ✏️ تحديث nav items
│   │   ├── dashboard-nav.tsx                ← ✏️ تحديث breadcrumb labels
│   │   ├── activity-panel.tsx               ← ✏️ إشعارات حقيقية
│   │   └── welcome-banner.tsx               ← ✏️ خطوات onboarding
│   ├── whatsapp/                            ← 🆕 كامل
│   │   ├── embedded-signup-button.tsx
│   │   ├── waba-status-card.tsx
│   │   ├── phone-number-card.tsx
│   │   ├── message-composer.tsx
│   │   ├── template-builder.tsx
│   │   ├── template-preview.tsx
│   │   └── message-status-badge.tsx
│   ├── api-keys/                            ← 🆕 كامل
│   │   ├── create-key-dialog.tsx
│   │   ├── key-card.tsx
│   │   └── key-revealed-dialog.tsx
│   ├── contacts/                            ← 🆕
│   │   ├── create-contact-dialog.tsx
│   │   └── contact-card.tsx
│   ├── webhooks/                            ← 🆕
│   │   ├── create-webhook-dialog.tsx
│   │   └── webhook-card.tsx
│   ├── billing/                             ← 🆕
│   │   ├── plan-card.tsx
│   │   └── invoice-row.tsx
│   ├── wallet/                              ← 🆕
│   │   ├── balance-card.tsx
│   │   ├── top-up-dialog.tsx
│   │   ├── auto-recharge-dialog.tsx
│   │   ├── transaction-row.tsx
│   │   └── pricing-table.tsx
│   └── shared/                              ← 🆕
│       ├── empty-state.tsx
│       ├── loading-skeleton.tsx
│       ├── error-state.tsx
│       ├── pagination.tsx
│       ├── confirm-dialog.tsx
│       ├── code-block.tsx
│       ├── stats-card.tsx
│       └── usage-bar.tsx
│
├── hooks/                                   ← 🆕 كامل
│   ├── use-api-keys.ts
│   ├── use-waba.ts
│   ├── use-phone-numbers.ts
│   ├── use-messages.ts
│   ├── use-templates.ts
│   ├── use-contacts.ts
│   ├── use-webhooks.ts
│   ├── use-usage.ts
│   ├── use-subscription.ts
│   ├── use-wallet.ts
│   ├── use-logs.ts
│   └── use-notifications.ts
│
├── lib/
│   ├── api-client.ts                        ← بدون تغيير
│   ├── config.ts                            ← بدون تغيير
│   ├── utils.ts                             ← بدون تغيير
│   └── api/
│       ├── auth.ts                          ← بدون تغيير
│       ├── developer.ts                     ← 🆕 API Keys + Subscription + Usage
│       ├── whatsapp.ts                      ← 🆕 WABA + Messages + Templates
│       ├── wallet.ts                        ← 🆕 محفظة + شحن + معاملات
│       ├── contacts.ts                      ← 🆕
│       ├── webhooks.ts                      ← 🆕
│       └── types.ts                         ← 🆕 TypeScript interfaces
│
├── providers/
│   ├── auth-provider.tsx                    ← بدون تغيير
│   └── query-provider.tsx                   ← ✏️ تحسين config
│
└── public/
    └── svg-dev/                             ← بدون تغيير
```

---

## 3. طبقة API Client — الاتصال بالـ Backend

### 3.1 BFF Proxy الجديد

**الملف:** `app/api/developer/[...path]/route.ts`

```typescript
// المسارات المسموحة
const ALLOWED_PREFIXES = [
  'api-keys',         // مفاتيح API
  'whatsapp',         // WABA + Phone Numbers
  'subscription',     // الاشتراك
  'wallet',           // المحفظة والمعاملات
  'webhooks',         // Developer Webhooks
  'contacts',         // جهات الاتصال
  'usage',            // الاستخدام
];

// يعيد توجيه الطلبات إلى:
// /api/developer/api-keys → API_BACKEND_URL/api/v1/developer/api-keys
// /api/developer/whatsapp/connect → API_BACKEND_URL/api/v1/developer/whatsapp/connect

// يمرّر:
// - Cookies (auth)
// - X-CSRF-Token
// - Content-Type
// - يعيد Set-Cookie headers

// Rate Limiting:
// - 120 req/min per IP (أعلى من auth proxy لأن developer يحتاج طلبات أكثر)
```

### 3.2 TypeScript Types

**الملف:** `lib/api/types.ts`

```typescript
// ═══ API Keys ═══
export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;        // "rk_live_"
  lastFourChars: string;    // "x0z9"
  scopes: string[];
  status: 'ACTIVE' | 'REVOKED' | 'EXPIRED';
  rateLimit: number;
  dailyLimit: number;
  lastUsedAt: string | null;
  lastUsedIp: string | null;
  expiresAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreateApiKeyRequest {
  name: string;
  scopes: string[];
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  apiKey: ApiKey;
  fullKey: string;           // يُعرض مرة واحدة فقط
}

// ═══ WABA ═══
export interface WabaAccount {
  id: string;
  wabaId: string;
  wabaName: string | null;
  status: 'PENDING_SETUP' | 'ACTIVE' | 'SUSPENDED' | 'RESTRICTED' | 'DISCONNECTED';
  businessName: string | null;
  businessVerified: boolean;
  accountReviewStatus: string | null;
  createdAt: string;
}

export interface PhoneNumber {
  id: string;
  phoneNumberId: string;
  phoneNumber: string;
  displayPhoneNumber: string;
  verifiedName: string | null;
  status: 'PENDING' | 'CONNECTED' | 'DISCONNECTED' | 'BANNED';
  qualityRating: 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN' | null;
  messagingLimitTier: string | null;
  totalMessagesSent: number;
  totalMessagesReceived: number;
  lastMessageAt: string | null;
  createdAt: string;
}

// ═══ Messages ═══
export interface SendMessageRequest {
  from: string;              // phone_number_id
  to: string;                // +9647xxxxxxxxx
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive';
  text?: { body: string; preview_url?: boolean };
  image?: { link: string; caption?: string };
  template?: {
    name: string;
    language: { code: string };
    components?: any[];
  };
  interactive?: any;
}

export interface MessageLog {
  id: string;
  direction: 'OUTBOUND' | 'INBOUND';
  toNumber: string;
  fromNumber: string;
  messageType: string;
  content: any;
  templateName: string | null;
  status: 'ACCEPTED' | 'QUEUED' | 'SENT' | 'DELIVERED' | 'READ' | 'FAILED';
  errorCode: string | null;
  errorMessage: string | null;
  estimatedCost: number;
  sentAt: string | null;
  deliveredAt: string | null;
  readAt: string | null;
  createdAt: string;
}

// ═══ Templates ═══
export interface WhatsappTemplate {
  id: string;
  name: string;
  language: string;
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';
  headerType: string | null;
  headerContent: string | null;
  bodyText: string;
  footerText: string | null;
  buttons: any;
  rejectionReason: string | null;
  qualityScore: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  language: string;
  category: 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
  components: any[];
}

// ═══ Contacts ═══
export interface Contact {
  id: string;
  phoneNumber: string;
  countryCode: string | null;
  name: string | null;
  email: string | null;
  tags: string[];
  customFields: Record<string, any> | null;
  waProfileName: string | null;
  isWaUser: boolean;
  totalMessages: number;
  lastMessageAt: string | null;
  isOptedIn: boolean;
  createdAt: string;
}

// ═══ Webhooks ═══
export interface DeveloperWebhook {
  id: string;
  url: string;
  secret: string;
  events: string[];
  status: 'ACTIVE' | 'DISABLED' | 'AUTO_DISABLED';
  successCount: number;
  failureCount: number;
  consecutiveFails: number;
  lastDeliveryAt: string | null;
  lastFailureAt: string | null;
  lastResponseCode: number | null;
  createdAt: string;
}

// ═══ Subscription ═══
export interface DeveloperSubscription {
  id: string;
  plan: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  status: 'ACTIVE' | 'EXPIRED' | 'CANCELLED';
  billingCycle: 'MONTHLY' | 'YEARLY' | null;
  currentPeriodStart: string;
  currentPeriodEnd: string | null;
  apiCallsUsed: number;
  messagesUsed: number;
  balance: number;
}

export interface DeveloperPlanLimits {
  maxApiKeys: number;
  maxPhoneNumbers: number;
  maxWebhooks: number;
  maxContacts: number;
  monthlyMessages: number;
  monthlyApiCalls: number;
  apiRateLimit: number;
  templateManagement: boolean;
  webhookRetries: number;
  logRetentionDays: number;
  priorityQueue: boolean;
  dedicatedSupport: boolean;
}

// ═══ Wallet (المحفظة) ═══
export interface Wallet {
  id: string;
  balance: number;                // الرصيد الحالي بالدينار العراقي (IQD)
  currency: 'IQD';               // العملة
  totalTopUps: number;            // إجمالي الشحنات
  totalSpent: number;             // إجمالي المصروف
  autoRechargeEnabled: boolean;
  autoRechargeThreshold: number | null;  // شحن تلقائي عند هذا الحد
  autoRechargeAmount: number | null;     // مبلغ الشحن التلقائي
  lowBalanceAlert: number | null;        // تنبيه عند هذا الرصيد
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  type: 'TOP_UP' | 'MESSAGE_CHARGE' | 'REFUND' | 'SUBSCRIPTION_CHARGE' | 'BONUS' | 'ADJUSTMENT';
  amount: number;                 // موجب = إيداع، سالب = خصم
  balanceAfter: number;           // الرصيد بعد العملية
  description: string;            // "رسالة إلى +9647xxx" / "شحن عبر ZainCash"
  referenceId: string | null;     // message_id / invoice_id
  referenceType: string | null;   // 'message' / 'invoice' / 'subscription'
  paymentMethod: string | null;   // 'zain_cash' / 'fast_pay' / 'card' / null
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'REVERSED';
  createdAt: string;
}

export interface TopUpRequest {
  amount: number;                 // المبلغ
  paymentMethod: 'zain_cash' | 'fast_pay' | 'card';
  returnUrl?: string;             // للتوجيه بعد الدفع
}

export interface TopUpResponse {
  transactionId: string;
  paymentUrl: string;             // رابط بوابة الدفع (إذا كان external)
  status: 'PENDING' | 'COMPLETED';
}

export interface AutoRechargeSettings {
  enabled: boolean;
  threshold: number;              // شحن تلقائي عندما يصل الرصيد لهذا الحد
  amount: number;                 // المبلغ المشحون تلقائياً
  paymentMethod: 'zain_cash' | 'fast_pay' | 'card';
}

export interface MessagePricing {
  conversationType: 'utility' | 'authentication' | 'marketing' | 'service';
  pricePerConversation: number;   // بالدينار العراقي
  description: string;
}

// ═══ Usage ═══
export interface UsageSummary {
  apiCalls: { used: number; limit: number };
  messages: { used: number; limit: number };
  apiKeys: { used: number; limit: number };
  phoneNumbers: { used: number; limit: number };
  webhooks: { used: number; limit: number };
  contacts: { used: number; limit: number };
  walletBalance: number;
  currentPeriod: { start: string; end: string };
}

export interface DailyUsage {
  date: string;
  apiCalls: number;
  messages: number;
}

// ═══ API Request Log ═══
export interface ApiRequestLog {
  id: string;
  method: string;
  path: string;
  statusCode: number;
  duration: number | null;
  ip: string | null;
  createdAt: string;
}

// ═══ Paginated Response ═══
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ═══ Webhook Events ═══
export const WEBHOOK_EVENTS = [
  'message.sent',
  'message.delivered',
  'message.read',
  'message.failed',
  'message.received',
  'template.approved',
  'template.rejected',
  'template.status_updated',
  'account.status_updated',
  'phone.quality_updated',
] as const;

export type WebhookEvent = typeof WEBHOOK_EVENTS[number];

// ═══ API Key Scopes ═══
export const API_KEY_SCOPES = [
  'whatsapp:send',
  'whatsapp:read',
  'whatsapp:templates',
  'whatsapp:phone',
  'contacts:write',
  'contacts:read',
  'webhooks:manage',
  'media:upload',
] as const;

export type ApiKeyScope = typeof API_KEY_SCOPES[number];
```

### 3.3 Developer API Functions

**الملف:** `lib/api/developer.ts`

```typescript
// ═══ API Keys ═══
export const apiKeysApi = {
  list: ()                              => api.get<ApiKey[]>('/developer/api-keys'),
  create: (data: CreateApiKeyRequest)   => api.post<CreateApiKeyResponse>('/developer/api-keys', data),
  revoke: (id: string)                  => api.delete<void>(`/developer/api-keys/${id}`),
  update: (id: string, data: Partial<{name: string; scopes: string[]}>) 
                                        => api.patch<ApiKey>(`/developer/api-keys/${id}`, data),
};

// ═══ Subscription ═══
export const subscriptionApi = {
  getCurrent: ()                        => api.get<DeveloperSubscription>('/developer/subscription'),
  getPlans: ()                          => api.get<any[]>('/developer/subscription/plans'),
  upgrade: (plan: string, cycle: string)=> api.post<any>('/developer/subscription/upgrade', { plan, billingCycle: cycle }),
};

// ═══ Usage ═══
export const usageApi = {
  getSummary: ()                        => api.get<UsageSummary>('/developer/usage'),
  getDaily: (params?: { from?: string; to?: string })
                                        => api.get<DailyUsage[]>('/developer/usage/daily', params),
  getMessageStats: ()                   => api.get<any>('/developer/usage/messages'),
};
```

**الملف:** `lib/api/whatsapp.ts`

```typescript
// ═══ WABA (Accounts) ═══
export const wabaApi = {
  getConnectUrl: ()                     => api.post<{ url: string }>('/developer/whatsapp/connect'),
  callback: (code: string, state: string)
                                        => api.get<any>('/developer/whatsapp/callback', { code, state }),
  listAccounts: ()                      => api.get<WabaAccount[]>('/developer/whatsapp/accounts'),
  disconnect: (id: string)              => api.delete<void>(`/developer/whatsapp/accounts/${id}`),
  refresh: (id: string)                 => api.post<WabaAccount>(`/developer/whatsapp/accounts/${id}/refresh`),
};

// ═══ Phone Numbers ═══
export const phoneNumbersApi = {
  list: ()                              => api.get<PhoneNumber[]>('/developer/whatsapp/phone-numbers'),
  get: (id: string)                     => api.get<PhoneNumber>(`/developer/whatsapp/phone-numbers/${id}`),
  register: (id: string)                => api.post<PhoneNumber>(`/developer/whatsapp/phone-numbers/${id}/register`),
  updateProfile: (id: string, data: any)=> api.patch<PhoneNumber>(`/developer/whatsapp/phone-numbers/${id}/profile`, data),
};

// ═══ Messages ═══
export const messagesApi = {
  send: (data: SendMessageRequest)      => api.post<MessageLog>('/developer/whatsapp/messages', data),
  get: (id: string)                     => api.get<MessageLog>(`/developer/whatsapp/messages/${id}`),
  list: (params?: { page?: number; limit?: number; status?: string; direction?: string })
                                        => api.get<PaginatedResponse<MessageLog>>('/developer/whatsapp/messages', params),
};

// ═══ Templates ═══
export const templatesApi = {
  list: ()                              => api.get<WhatsappTemplate[]>('/developer/whatsapp/templates'),
  create: (data: CreateTemplateRequest) => api.post<WhatsappTemplate>('/developer/whatsapp/templates', data),
  get: (name: string, lang: string)     => api.get<WhatsappTemplate>(`/developer/whatsapp/templates/${name}/${lang}`),
  update: (name: string, lang: string, data: any)
                                        => api.patch<WhatsappTemplate>(`/developer/whatsapp/templates/${name}/${lang}`, data),
  delete: (name: string)                => api.delete<void>(`/developer/whatsapp/templates/${name}`),
};
```

**الملف:** `lib/api/contacts.ts`

```typescript
export const contactsApi = {
  list: (params?: { page?: number; limit?: number; search?: string })
                                        => api.get<PaginatedResponse<Contact>>('/developer/contacts', params),
  create: (data: Partial<Contact>)      => api.post<Contact>('/developer/contacts', data),
  get: (id: string)                     => api.get<Contact>(`/developer/contacts/${id}`),
  update: (id: string, data: Partial<Contact>)
                                        => api.patch<Contact>(`/developer/contacts/${id}`, data),
  delete: (id: string)                  => api.delete<void>(`/developer/contacts/${id}`),
};
```

**الملف:** `lib/api/webhooks.ts`

```typescript
export const webhooksApi = {
  list: ()                              => api.get<DeveloperWebhook[]>('/developer/webhooks'),
  create: (data: { url: string; events: string[] })
                                        => api.post<DeveloperWebhook>('/developer/webhooks', data),
  update: (id: string, data: Partial<{ url: string; events: string[]; status: string }>)
                                        => api.patch<DeveloperWebhook>(`/developer/webhooks/${id}`, data),
  delete: (id: string)                  => api.delete<void>(`/developer/webhooks/${id}`),
  test: (id: string)                    => api.post<any>(`/developer/webhooks/${id}/test`),
  rotateSecret: (id: string)            => api.post<{ secret: string }>(`/developer/webhooks/${id}/rotate-secret`),
};
```

**الملف:** `lib/api/wallet.ts`

```typescript
export const walletApi = {
  // الرصيد والمعلومات
  getWallet: ()                         => api.get<Wallet>('/developer/wallet'),
  getPricing: ()                        => api.get<MessagePricing[]>('/developer/wallet/pricing'),

  // شحن الرصيد
  topUp: (data: TopUpRequest)           => api.post<TopUpResponse>('/developer/wallet/top-up', data),
  verifyTopUp: (transactionId: string)  => api.get<WalletTransaction>(`/developer/wallet/top-up/${transactionId}/verify`),

  // سجل المعاملات
  getTransactions: (params?: { 
    page?: number; limit?: number; type?: string; from?: string; to?: string 
  })                                    => api.get<PaginatedResponse<WalletTransaction>>('/developer/wallet/transactions', params),

  // الشحن التلقائي
  getAutoRecharge: ()                   => api.get<AutoRechargeSettings>('/developer/wallet/auto-recharge'),
  updateAutoRecharge: (data: AutoRechargeSettings)
                                        => api.put<AutoRechargeSettings>('/developer/wallet/auto-recharge', data),

  // تنبيه الرصيد المنخفض
  updateLowBalanceAlert: (threshold: number | null)
                                        => api.patch<Wallet>('/developer/wallet/settings', { lowBalanceAlert: threshold }),
};
```

---

## 4. نظام إدارة الحالة (State Management)

### 4.1 React Query Hooks

كل hook يتبع هذا النمط:

```typescript
// مثال: hooks/use-api-keys.ts

export function useApiKeys() {
  return useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiKeysApi.list().then(r => r.data),
  });
}

export function useCreateApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateApiKeyRequest) => apiKeysApi.create(data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] }); // يؤثر على العدد
    },
  });
}

export function useRevokeApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiKeysApi.revoke(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });
}
```

### 4.2 قائمة Hooks المطلوبة

| Hook | Query Key | Endpoint | نوع |
|------|-----------|----------|-----|
| `useApiKeys()` | `['api-keys']` | GET /developer/api-keys | Query |
| `useCreateApiKey()` | — | POST /developer/api-keys | Mutation |
| `useRevokeApiKey()` | — | DELETE /developer/api-keys/:id | Mutation |
| `useWabaAccounts()` | `['waba-accounts']` | GET /developer/whatsapp/accounts | Query |
| `useConnectWaba()` | — | POST /developer/whatsapp/connect | Mutation |
| `useDisconnectWaba()` | — | DELETE /developer/whatsapp/accounts/:id | Mutation |
| `usePhoneNumbers()` | `['phone-numbers']` | GET /developer/whatsapp/phone-numbers | Query |
| `useSendMessage()` | — | POST /developer/whatsapp/messages | Mutation |
| `useMessageLogs(params)` | `['message-logs', params]` | GET /developer/whatsapp/messages | Query |
| `useTemplates()` | `['templates']` | GET /developer/whatsapp/templates | Query |
| `useCreateTemplate()` | — | POST /developer/whatsapp/templates | Mutation |
| `useDeleteTemplate()` | — | DELETE /developer/whatsapp/templates/:name | Mutation |
| `useContacts(params)` | `['contacts', params]` | GET /developer/contacts | Query |
| `useCreateContact()` | — | POST /developer/contacts | Mutation |
| `useUpdateContact()` | — | PATCH /developer/contacts/:id | Mutation |
| `useDeleteContact()` | — | DELETE /developer/contacts/:id | Mutation |
| `useWebhooks()` | `['webhooks']` | GET /developer/webhooks | Query |
| `useCreateWebhook()` | — | POST /developer/webhooks | Mutation |
| `useUpdateWebhook()` | — | PATCH /developer/webhooks/:id | Mutation |
| `useDeleteWebhook()` | — | DELETE /developer/webhooks/:id | Mutation |
| `useTestWebhook()` | — | POST /developer/webhooks/:id/test | Mutation |
| `useSubscription()` | `['subscription']` | GET /developer/subscription | Query |
| `useUpgradePlan()` | — | POST /developer/subscription/upgrade | Mutation |
| `useWallet()` | `['wallet']` | GET /developer/wallet | Query |
| `useWalletTransactions(params)` | `['wallet-transactions', params]` | GET /developer/wallet/transactions | Query |
| `useTopUp()` | — | POST /developer/wallet/top-up | Mutation |
| `useVerifyTopUp()` | — | GET /developer/wallet/top-up/:id/verify | Mutation |
| `useAutoRecharge()` | `['auto-recharge']` | GET /developer/wallet/auto-recharge | Query |
| `useUpdateAutoRecharge()` | — | PUT /developer/wallet/auto-recharge | Mutation |
| `useMessagePricing()` | `['message-pricing']` | GET /developer/wallet/pricing | Query |
| `useUsageSummary()` | `['usage']` | GET /developer/usage | Query |
| `useDailyUsage(params)` | `['daily-usage', params]` | GET /developer/usage/daily | Query |
| `useApiLogs(params)` | `['api-logs', params]` | GET /developer/usage/logs | Query |

### 4.3 Query Invalidation Map

عند نجاح عملية كتابة (mutation)، يجب تحديث البيانات المتأثرة:

```
إنشاء API Key    → invalidate: ['api-keys'], ['usage']
إلغاء API Key    → invalidate: ['api-keys'], ['usage']
ربط WABA         → invalidate: ['waba-accounts'], ['phone-numbers'], ['usage']
فك ربط WABA      → invalidate: ['waba-accounts'], ['phone-numbers']
إرسال رسالة      → invalidate: ['message-logs'], ['usage']
إنشاء قالب       → invalidate: ['templates']
إنشاء جهة اتصال  → invalidate: ['contacts'], ['usage']
إنشاء Webhook    → invalidate: ['webhooks'], ['usage']
ترقية الخطة      → invalidate: ['subscription'], ['usage'], ['wallet']
شحن رصيد         → invalidate: ['wallet'], ['wallet-transactions'], ['usage']
تفعيل شحن تلقائي  → invalidate: ['auto-recharge'], ['wallet']
```

---

## 5. إعادة هيكلة الصفحات الحالية

### 5.1 Dashboard — الصفحة الرئيسية

**الملف:** `dashboard/page.tsx`

**التغييرات:**
```
قبل: أرقام ثابتة (12,847 / 3,291 / 4 / 99.2%)
بعد: useUsageSummary() + useApiKeys() + useSubscription() + useWallet()
  + بطاقة رصيد المحفظة (تحذير إذا منخفض)

قبل: مخطط أسبوعي ثابت
بعد: useDailyUsage({ from: 7_days_ago })

قبل: آخر طلبات API ثابتة
بعد: useApiLogs({ limit: 6 })

قبل: Quick Actions ثابتة
بعد: Quick Actions ذكية (تتغير حسب حالة WABA):
  - إذا لم يُربط WABA → "اربط حساب WhatsApp" بدل "إرسال رسالة"
  - إذا لا يوجد API Key → "أنشئ مفتاح API" أوّلاً

قبل: cURL snippet ثابت
بعد: cURL snippet يتضمن أول API Key حقيقي (مخفي جزئياً)
```

**الحالات:**
```
Loading  → Skeleton cards (4) + skeleton chart + skeleton table
Error    → Error state مع زر إعادة المحاولة
Empty    → Welcome banner مع خطوات onboarding
Data     → كل البيانات حقيقية
```

### 5.2 API Keys

**الملف:** `dashboard/api-keys/page.tsx`

**التغييرات:**
```
قبل: DEMO_KEYS ثابتة، لا أزرار تعمل
بعد:
  - useApiKeys() لعرض المفاتيح
  - زر "مفتاح جديد" يفتح CreateKeyDialog
  - CreateKeyDialog: اسم + اختيار scopes + تاريخ انتهاء (اختياري)
  - بعد الإنشاء: KeyRevealedDialog يعرض المفتاح الكامل مرة واحدة
  - زر نسخ يعمل حقيقياً
  - زر إلغاء يفتح ConfirmDialog ثم يستدعي useRevokeApiKey()
  - عداد: عدد المفاتيح / الحد حسب الخطة
```

**المكونات المستخدمة:**
```
- CreateKeyDialog (جديد)
- KeyRevealedDialog (جديد)
- ConfirmDialog (مشترك)
- KeyCard (جديد — يستبدل inline code الحالي)
- EmptyState (مشترك)
- LoadingSkeleton (مشترك)
```

### 5.3 WhatsApp Send

**الملف:** `dashboard/whatsapp/send/page.tsx`

**التغييرات:**
```
قبل: setTimeout(1500) — محاكاة فقط
بعد:
  - usePhoneNumbers() لاختيار الرقم المرسل (dropdown)
  - اختيار نوع الرسالة: text / template / image
  - إذا template → dropdown يعرض القوالب المعتمدة + حقول المتغيرات
  - useSendMessage() للإرسال الحقيقي
  - عرض الاستجابة: message_id, status, estimated_cost
  - cURL مولّد ديناميكياً مع API Key حقيقي

  شرط مسبق: يجب ربط WABA + رقم هاتف أولاً
  إذا لم يوجد → رسالة + رابط لصفحة الربط
```

### 5.4 Templates

**الملف:** `dashboard/whatsapp/templates/page.tsx`

**التغييرات:**
```
قبل: DEMO_TEMPLATES ثابتة
بعد:
  - useTemplates() لجلب القوالب حقيقياً
  - زر "قالب جديد" → صفحة /templates/create
  - عرض الحالة اللحظية (PENDING/APPROVED/REJECTED) من Meta
  - زر حذف يعمل مع ConfirmDialog
  - عرض rejection reason إذا رُفض
  - فلتر حسب الحالة والتصنيف
```

### 5.5 Contacts

**الملف:** `dashboard/whatsapp/contacts/page.tsx`

**التغييرات:**
```
قبل: DEMO_CONTACTS ثابتة
بعد:
  - useContacts({ page, search }) مع pagination
  - بحث حي (debounced 300ms)
  - زر "إضافة جهة اتصال" يفتح CreateContactDialog
  - اسم + رقم + بريد + tags
  - حذف مع ConfirmDialog
  - عرض حالة opt-in/opt-out
  - عداد: عدد جهات الاتصال / الحد حسب الخطة
```

### 5.6 Webhooks

**الملف:** `dashboard/whatsapp/webhooks/page.tsx`

**التغييرات:**
```
قبل: DEMO_WEBHOOKS ثابتة
بعد:
  - useWebhooks() لعرض Webhooks
  - زر "webhook جديد" يفتح CreateWebhookDialog:
    - URL (مع validation: يجب HTTPS)
    - اختيار أحداث (multi-select chips)
  - بعد الإنشاء: عرض Secret مرة واحدة
  - زر اختبار (test) يرسل payload تجريبي
  - زر تدوير Secret مع ConfirmDialog
  - مؤشر الصحة: نسبة النجاح + آخر فشل
  - عداد: عدد Webhooks / الحد حسب الخطة
```

### 5.7 Logs

**الملف:** `dashboard/whatsapp/logs/page.tsx`

**التغييرات:**
```
قبل: DEMO_LOGS ثابتة
بعد:
  - useApiLogs({ page, method, status, from, to }) مع pagination
  - فلاتر فعلية:
    - Method: ALL / GET / POST / DELETE
    - Status: ALL / 2xx / 4xx / 5xx
    - الفترة: اليوم / الأسبوع / الشهر / مخصص
  - تحميل المزيد (infinite scroll أو pagination)
  - عرض تفاصيل الطلب عند النقر (expandable row):
    - Request body
    - Response body
    - Headers
```

### 5.8 Usage

**الملف:** `dashboard/usage/page.tsx`

**التغييرات:**
```
قبل: أرقام ثابتة
بعد:
  - useUsageSummary() لعرض الحصص الحقيقية
  - useDailyUsage() للمخطط اليومي
  - عرض الفترة الحالية من الاشتراك
  - تنبيه عند تجاوز 80% من الحصة
  - تنبيه عند الوصول 100% مع رابط ترقية
  - مخطط دائري: توزيع الرسائل حسب النوع
  - مخطط: معدل النجاح/الفشل
```

### 5.9 Billing

**الملف:** `dashboard/billing/page.tsx`

**التغييرات:**
```
قبل: 3 خطط ثابتة + فواتير ثابتة
بعد:
  - useSubscription() للخطة الحالية
  - subscriptionApi.getPlans() للخطط المتاحة (مع الحدود الدقيقة)
  - زر "ترقية" → ConfirmDialog مع تفاصيل الخطة الجديدة
  - عرض حالة الاشتراك: نشط / منتهي / ملغي
  - سجل الفواتير الحقيقية
  - 4 خطط بدلاً من 3:
    - Free ($0) / Starter ($29) / Growth ($99) / Enterprise (Custom)

  ملاحظة: "شحن الرصيد" انتقل إلى صفحة المحفظة
  رابط: "اذهب للمحفظة لشحن الرصيد" → /dashboard/wallet
```

### 5.10 Activity Panel

**الملف:** `components/dashboard/activity-panel.tsx`

**التغييرات:**
```
قبل: INITIAL_NOTIFICATIONS ثابتة
بعد:
  - useNotifications() (polling كل 30 ثانية)
  - أو WebSocket إذا متاح
  - إشعارات حقيقية:
    - نجاح إنشاء API Key
    - تغير حالة قالب (APPROVED/REJECTED)
    - تجاوز حصة
    - فشل Webhook
    - تحديثات النظام
  - mark as read/dismiss يرسل API call
  - useUnreadCount() hook يعمل حقيقياً
```

### 5.11 Sidebar

**الملف:** `components/dashboard/sidebar.tsx`

**التغييرات:**
```
تحديث NAV_ITEMS:
  - إضافة child "الحسابات والأرقام" → /dashboard/whatsapp/accounts
  - تغيير "الحساب" إلى "نظرة عامة" → /dashboard/whatsapp
  - ترتيب children:
    1. نظرة عامة
    2. الحسابات والأرقام (جديد)
    3. إرسال رسالة
    4. القوالب
    5. جهات الاتصال
    6. Webhooks
    7. سجل الرسائل

  إضافة "المحفظة" كعنصر مستقل (بين الاستخدام والفوترة):
    - الاستخدام
    - 🆕 المحفظة → /dashboard/wallet (+ mini badge للرصيد)
    - الفوترة

تحديث BOTTOM_ITEMS:
  - إضافة "التوثيق" → /dashboard/docs

تحديث nav badge:
  - عرض عدد الإشعارات غير المقروءة بجانب "التنبيهات" (mobile)
```

### 5.12 Dashboard Nav

**الملف:** `components/dashboard/dashboard-nav.tsx`

**التغييرات:**
```
تحديث labelMap:
  + accounts: 'الحسابات والأرقام'
  + wallet: 'المحفظة'
  + create: 'إنشاء جديد'
  + 'quick-start': 'بداية سريعة'
  + 'api-reference': 'مرجع API'
```

---

## 6. الصفحات الجديدة

### 6.1 WhatsApp Overview

**المسار:** `/dashboard/whatsapp` (استبدال الصفحة الحالية أو إنشائها إذا لم تكن موجودة)

**يعتمد على:** `useWabaAccounts()` + `usePhoneNumbers()` + `useUsageSummary()`

```
┌──────────────────────────────────────────────────────────┐
│ WhatsApp Business API                                     │
│                                                          │
│ ═══ حالة الحساب ═══                                      │
│                                                          │
│ [إذا لم يُربط]                                           │
│ ┌────────────────────────────────────────────────────┐   │
│ │  🔗 اربط حساب WhatsApp Business                   │   │
│ │                                                    │   │
│ │  يتطلب حساب Meta Business ورقم هاتف غير           │   │
│ │  مستخدم في WhatsApp العادي                         │   │
│ │                                                    │   │
│ │  [🟢 ربط حساب WhatsApp Business]                  │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ [إذا مربوط]                                              │
│ ┌─ إحصائيات ──────────────────────────────────────────┐  │
│ │  📤 الرسائل اليوم: 156  │  ✅ معدل التوصيل: 98.5%  │  │
│ │  📱 الأرقام النشطة: 1   │  📋 القوالب المعتمدة: 5   │  │
│ └─────────────────────────────────────────────────────┘  │
│                                                          │
│ ═══ بداية سريعة ═══                                      │
│                                                          │
│ ①  اربط حساب WhatsApp Business  ✅ مكتمل               │
│ ②  أنشئ مفتاح API  → رابط                               │
│ ③  أرسل أول رسالة → رابط                                │
│                                                          │
│ cURL أول رسالة:                                          │
│ ┌────────────────────────────────────────────────────┐   │
│ │ curl -X POST https://api.rukny.io/v1/...          │   │
│ └────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 6.2 WhatsApp Accounts & Phone Numbers

**المسار:** `/dashboard/whatsapp/accounts`

**يعتمد على:** `useWabaAccounts()` + `usePhoneNumbers()`

```
┌──────────────────────────────────────────────────────────┐
│ الحسابات والأرقام                                        │
│                                                          │
│ ═══ حسابات WABA ═══                                      │
│                                                          │
│ ┌─ WABA Card ────────────────────────────────────────┐   │
│ │  📱 اسم النشاط: شركة أحمد للتقنية                  │   │
│ │  WABA ID: 1234567890                               │   │
│ │  الحالة: 🟢 نشط                                    │   │
│ │  التحقق: ✅ معتمد من Meta                          │   │
│ │                                                    │   │
│ │  [تحديث الحالة]  [فك الارتباط]                     │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ═══ أرقام الهاتف ═══                                     │
│                                                          │
│ ┌─ Phone Card ───────────────────────────────────────┐   │
│ │  📞 +964 770 123 4567                              │   │
│ │  الاسم المعتمد: شركة أحمد                          │   │
│ │  الحالة: 🟢 متصل                                   │   │
│ │  جودة الرقم: 🟢 GREEN                              │   │
│ │  حد الإرسال: TIER_1K (1,000 محادثة/يوم)           │   │
│ │  الرسائل المرسلة: 1,234                            │   │
│ │                                                    │   │
│ │  Phone Number ID: 9876543210                       │   │
│ │  (للاستخدام في API كـ "from" parameter)            │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ℹ️ الحد الأقصى للأرقام في خطتك: 1 (Free)               │
│    ← ترقية لإضافة المزيد                                │
└──────────────────────────────────────────────────────────┘
```

### 6.3 Create Template

**المسار:** `/dashboard/whatsapp/templates/create`

**يعتمد على:** `useCreateTemplate()`

```
┌──────────────────────────────────────────────────────────┐
│ ← العودة للقوالب          إنشاء قالب جديد                │
│                                                          │
│ ┌─ نموذج ────────────────┐  ┌─ معاينة ──────────────┐   │
│ │                        │  │                        │   │
│ │ اسم القالب:            │  │  ┌────────────────┐   │   │
│ │ [order_confirmation]   │  │  │  📱 معاينة     │   │   │
│ │                        │  │  │                │   │   │
│ │ التصنيف:               │  │  │  Header:       │   │   │
│ │ ○ UTILITY              │  │  │  تأكيد الطلب   │   │   │
│ │ ○ MARKETING            │  │  │                │   │   │
│ │ ○ AUTHENTICATION       │  │  │  Body:         │   │   │
│ │                        │  │  │  مرحباً {{1}}  │   │   │
│ │ اللغة:                 │  │  │  طلبك {{2}}    │   │   │
│ │ [العربية ▾]            │  │  │                │   │   │
│ │                        │  │  │  Footer:       │   │   │
│ │ ═══ المكوّنات ═══       │  │  │  شكراً لك     │   │   │
│ │                        │  │  │                │   │   │
│ │ Header (اختياري):      │  │  │  [زر 1] [زر2] │   │   │
│ │ ○ بدون  ○ نص  ○ صورة   │  │  └────────────────┘   │   │
│ │ [تأكيد الطلب]         │  │                        │   │
│ │                        │  │                        │   │
│ │ Body (مطلوب):          │  │                        │   │
│ │ [textarea مع {{n}}    │  │                        │   │
│ │  variable support]     │  │                        │   │
│ │                        │  │                        │   │
│ │ Footer (اختياري):      │  │                        │   │
│ │ [شكراً لتسوقك معنا]   │  │                        │   │
│ │                        │  │                        │   │
│ │ أزرار (اختياري):       │  │                        │   │
│ │ [+ إضافة زر]          │  │                        │   │
│ │                        │  │                        │   │
│ │ [إنشاء القالب]        │  │                        │   │
│ └────────────────────────┘  └────────────────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### 6.4 Quick Start Guide

**المسار:** `/dashboard/docs/quick-start`

```
┌──────────────────────────────────────────────────────────┐
│ بداية سريعة — أرسل أول رسالة في 5 دقائق                  │
│                                                          │
│ ═══ الخطوة 1: إنشاء حساب ═══  ✅                        │
│ لقد أنشأت حسابك بالفعل!                                 │
│                                                          │
│ ═══ الخطوة 2: ربط WhatsApp Business ═══                  │
│ [شرح + زر ربط مباشر أو رابط للصفحة]                     │
│                                                          │
│ ═══ الخطوة 3: إنشاء مفتاح API ═══                       │
│ [شرح + زر إنشاء مباشر أو رابط للصفحة]                   │
│                                                          │
│ ═══ الخطوة 4: إرسال أول رسالة ═══                       │
│                                                          │
│ كود تفاعلي:                                              │
│ ┌────────────────────────────────────────────────────┐   │
│ │  [cURL] [JavaScript] [Python] [PHP]                │   │
│ │                                                    │   │
│ │  // استبدل YOUR_API_KEY بمفتاحك                    │   │
│ │  curl -X POST \                                    │   │
│ │    https://api.rukny.io/v1/whatsapp/messages \     │   │
│ │    -H "X-API-Key: YOUR_API_KEY" \                  │   │
│ │    -H "Content-Type: application/json" \           │   │
│ │    -d '{                                           │   │
│ │      "from": "PHONE_NUMBER_ID",                    │   │
│ │      "to": "+9647xxxxxxxxx",                       │   │
│ │      "type": "text",                               │   │
│ │      "text": {"body": "مرحباً من Rukny!"}         │   │
│ │    }'                                              │   │
│ │                                                    │   │
│ │  [📋 نسخ]                                          │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ═══ الخطوة 5: إعداد Webhook (اختياري) ═══               │
│ [شرح + رابط للصفحة]                                     │
│                                                          │
│ ═══ ماذا بعد؟ ═══                                        │
│ • إدارة القوالب                                          │
│ • API Reference                                          │
│ • إعداد Webhooks                                        │
└──────────────────────────────────────────────────────────┘
```

### 6.5 API Reference

**المسار:** `/dashboard/docs/api-reference`

```
┌──────────────────────────────────────────────────────────┐
│ API Reference                                            │
│                                                          │
│ BASE URL: https://api.rukny.io/v1                        │
│ Authentication: X-API-Key header                         │
│                                                          │
│ ┌─ sidebar ──┐  ┌─ content ───────────────────────────┐  │
│ │            │  │                                     │  │
│ │ Messages   │  │  POST /whatsapp/messages             │  │
│ │  • Send    │  │                                     │  │
│ │  • Get     │  │  إرسال رسالة WhatsApp               │  │
│ │            │  │                                     │  │
│ │ Templates  │  │  Headers:                           │  │
│ │  • Create  │  │  X-API-Key: rk_live_xxx             │  │
│ │  • List    │  │  Content-Type: application/json     │  │
│ │  • Delete  │  │                                     │  │
│ │            │  │  Body Parameters:                   │  │
│ │ Phone      │  │  ┌──────┬─────────┬────────────┐   │  │
│ │  • List    │  │  │ from │ string  │ مطلوب      │   │  │
│ │  • Get     │  │  │ to   │ string  │ مطلوب      │   │  │
│ │            │  │  │ type │ enum    │ مطلوب      │   │  │
│ │ Contacts   │  │  │ text │ object  │ شرطي       │   │  │
│ │  • CRUD    │  │  └──────┴─────────┴────────────┘   │  │
│ │            │  │                                     │  │
│ │ Webhooks   │  │  Response (200):                    │  │
│ │  • Events  │  │  { id, status, from, to, ... }     │  │
│ │            │  │                                     │  │
│ └────────────┘  │  Code Examples:                     │  │
│                 │  [cURL] [JS] [Python]               │  │
│                 └─────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### 6.6 Webhooks Documentation

**المسار:** `/dashboard/docs/webhooks`

```
- قائمة الأحداث المدعومة مع الوصف
- أمثلة payload لكل حدث
- كود التحقق من التوقيع (HMAC-SHA256) بـ 4 لغات
- شرح آلية إعادة المحاولة
- Best practices
```

---

## 7. المكوّنات المشتركة الجديدة

### 7.1 Empty State

```typescript
// components/shared/empty-state.tsx
interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
}

// يُستخدم في: API Keys (لا مفاتيح), Contacts (لا جهات اتصال), etc.
```

### 7.2 Loading Skeleton

```typescript
// components/shared/loading-skeleton.tsx
// variants: 'card' | 'table-row' | 'stats' | 'chart'
// يتبع نفس layout الصفحة لتجربة سلسة
```

### 7.3 Error State

```typescript
// components/shared/error-state.tsx
interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}
```

### 7.4 Confirm Dialog

```typescript
// components/shared/confirm-dialog.tsx
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;        // "حذف" / "إلغاء" / "تأكيد"
  variant?: 'default' | 'destructive';
  loading?: boolean;
  onConfirm: () => void;
}

// يُستخدم في: إلغاء API Key, حذف Webhook, فك ربط WABA, حذف جهة اتصال
```

### 7.5 Code Block

```typescript
// components/shared/code-block.tsx
interface CodeBlockProps {
  code: string;
  language: string;            // 'bash' | 'javascript' | 'python' | 'php' | 'json'
  title?: string;
  copyable?: boolean;
}

// يُستخدم في: Docs, Quick Start, cURL snippets في كل صفحة
```

### 7.6 Stats Card

```typescript
// components/shared/stats-card.tsx
// نسخة قابلة لإعادة الاستخدام من StatCard الموجود في dashboard/page.tsx
// يدعم: loading state (skeleton) + error state
```

### 7.7 Usage Bar

```typescript
// components/shared/usage-bar.tsx
// نسخة قابلة لإعادة الاستخدام من UsageBar الموجود في usage/page.tsx
// يدعم: color coding عند تجاوز 80% و 100%
```

### 7.8 Pagination

```typescript
// components/shared/pagination.tsx
interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

// يُستخدم في: Logs, Contacts, Messages
```

---

## 8. نظام Embedded Signup (ربط WhatsApp)

### 8.1 Embedded Signup Button

```typescript
// components/whatsapp/embedded-signup-button.tsx

// التدفق:
// 1. المطوّر يضغط زر "ربط حساب WhatsApp Business"
// 2. يُستدعى wabaApi.getConnectUrl() → يعيد URL المشفّر
// 3. يُفتح popup لـ Facebook OAuth (600x800)
// 4. المطوّر يمنح الصلاحيات في Meta
// 5. Meta يعيد التوجيه لـ callback مع code
// 6. الـ callback يرسل code للـ API
// 7. الـ API يتبادل code بـ access_token + يسجّل WABA
// 8. الـ popup يُغلق
// 9. الصفحة تُحدّث (invalidate queries)

// متطلبات:
// - NEXT_PUBLIC_WHATSAPP_APP_ID في env
// - NEXT_PUBLIC_WHATSAPP_CONFIG_ID في env
```

### 8.2 WABA Status Card

```typescript
// components/whatsapp/waba-status-card.tsx

// يعرض:
// - حالة WABA (نشط/معلّق/منتظر)
// - اسم النشاط التجاري
// - حالة التحقق من Meta
// - أزرار: تحديث الحالة / فك الارتباط
```

### 8.3 Phone Number Card

```typescript
// components/whatsapp/phone-number-card.tsx

// يعرض:
// - الرقم + الاسم المعتمد
// - Quality Rating (لون: أخضر/أصفر/أحمر)
// - Messaging Limit Tier
// - Phone Number ID (للنسخ واستخدامه في API)
// - إحصائيات: الرسائل المرسلة/المستلمة
```

---

## 9. نظام المحفظة (Wallet System)

### 9.1 نظرة عامة

نظام المحفظة هو القلب المالي للمنصة. كل رسالة WhatsApp تُخصم تكلفتها من رصيد المحفظة (Pay-as-you-go). العملة الأساسية: **الدينار العراقي (IQD)**.

```
تدفق المحفظة:
                                      
  شحن الرصيد ──────┐                 
  (ZainCash/FastPay/Card)             
                    ▼                 
              ┌──────────┐            
              │  المحفظة  │ ← رصيد IQD
              └────┬─────┘            
                   │                  
        ┌──────────┼──────────┐       
        ▼          ▼          ▼       
   رسائل WA   اشتراك شهري   رسوم API
   (per-msg)   (إذا مدفوع)   (مستقبلاً)
```

### 9.2 صفحة المحفظة

**المسار:** `/dashboard/wallet`

**يعتمد على:** `useWallet()` + `useWalletTransactions()` + `useMessagePricing()`

```
┌──────────────────────────────────────────────────────────┐
│ المحفظة                                                  │
│                                                          │
│ ┌─ بطاقة الرصيد ─────────────────────────────────────┐   │
│ │                                                    │   │
│ │   💰 الرصيد الحالي                                 │   │
│ │   ┌──────────────────┐                             │   │
│ │   │  250,000 د.ع     │     [🟢 شحن الرصيد]       │   │
│ │   └──────────────────┘                             │   │
│ │                                                    │   │
│ │   إجمالي الشحن: 500,000 د.ع  │  المصروف: 250,000  │   │
│ │                                                    │   │
│ │   ⚙️ الشحن التلقائي: مفعّل (شحن 100,000 عند 10,000)│   │
│ │   🔔 تنبيه الرصيد المنخفض: عند 25,000 د.ع         │   │
│ └────────────────────────────────────────────────────┘   │
│                                                          │
│ ═══ تسعير الرسائل ═══                                    │
│                                                          │
│ ┌────────────────────┬──────────────────────────────┐    │
│ │  نوع المحادثة       │  السعر لكل محادثة (24 ساعة) │    │
│ ├────────────────────┼──────────────────────────────┤    │
│ │  🛒 Marketing       │  750 د.ع                    │    │
│ │  🔧 Utility         │  500 د.ع                    │    │
│ │  🔐 Authentication  │  375 د.ع                    │    │
│ │  💬 Service         │  0 د.ع (مجاني)              │    │
│ └────────────────────┴──────────────────────────────┘    │
│                                                          │
│ ═══ سجل المعاملات ═══                                    │
│                                                          │
│  فلتر: [الكل ▾] [هذا الشهر ▾]                           │
│                                                          │
│ ┌─────────┬───────────────────────┬──────────┬─────────┐ │
│ │ التاريخ  │ الوصف                 │ المبلغ    │ الرصيد  │ │
│ ├─────────┼───────────────────────┼──────────┼─────────┤ │
│ │ اليوم   │ 📤 رسالة إلى +964... │ -500 د.ع │ 250,000│ │
│ │ اليوم   │ 📤 رسالة إلى +964... │ -750 د.ع │ 250,500│ │
│ │ أمس     │ 💳 شحن عبر ZainCash  │+100,000  │ 251,250│ │
│ │ أمس     │ 📤 15 رسالة utility   │ -7,500   │ 151,250│ │
│ │ ...     │ ...                   │ ...      │ ...    │ │
│ └─────────┴───────────────────────┴──────────┴─────────┘ │
│                                                          │
│ [الصفحة 1 من 5] [← →]                                   │
└──────────────────────────────────────────────────────────┘
```

### 9.3 مكوّنات المحفظة

**المجلد:** `components/wallet/`

#### balance-card.tsx
```typescript
// بطاقة الرصيد الرئيسية
interface BalanceCardProps {
  wallet: Wallet;
  onTopUp: () => void;
  onSettings: () => void;
}

// يعرض:
// - الرصيد الحالي (رقم كبير + عملة)
// - إجمالي الشحن / المصروف
// - حالة الشحن التلقائي (badge)
// - حالة تنبيه الرصيد المنخفض
// - زر "شحن الرصيد" (primary)
// - زر "الإعدادات" (secondary → settings icon)
//
// تنبيه بصري:
// - رصيد > lowBalanceAlert → أخضر
// - رصيد ≤ lowBalanceAlert → أصفر + نبض
// - رصيد = 0 → أحمر + تحذير "المحفظة فارغة!"
```

#### top-up-dialog.tsx
```typescript
// نافذة شحن الرصيد
interface TopUpDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// خطوات:
// 1. اختيار المبلغ:
//    - مبالغ سريعة: [25,000] [50,000] [100,000] [250,000] [500,000] د.ع
//    - أو مبلغ مخصص (minimum: 10,000 د.ع)
//
// 2. اختيار طريقة الدفع:
//    - ZainCash (الأكثر شيوعاً في العراق)
//    - FastPay
//    - بطاقة ائتمان/خصم
//
// 3. تأكيد + إعادة توجيه لبوابة الدفع
//    - بعد الدفع → redirect back + verify
//    - عرض نتيجة (نجاح/فشل) مع toast
```

#### auto-recharge-dialog.tsx
```typescript
// إعداد الشحن التلقائي
interface AutoRechargeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSettings: AutoRechargeSettings | null;
}

// حقول:
// - تفعيل/تعطيل (Switch)
// - حد الشحن التلقائي: "عندما يصل الرصيد إلى [___] د.ع"
// - مبلغ الشحن: "اشحن [___] د.ع تلقائياً"
// - طريقة الدفع المحفوظة
//
// Validation:
// - threshold > 0
// - amount ≥ 10,000
// - amount > threshold
```

#### transaction-row.tsx
```typescript
// صف في سجل المعاملات
interface TransactionRowProps {
  transaction: WalletTransaction;
}

// يعرض:
// - أيقونة حسب النوع: 📤 message / 💳 top-up / ↩️ refund / 📦 subscription / 🎁 bonus
// - التاريخ (relative: "قبل 5 دقائق" / "أمس" / تاريخ كامل)
// - الوصف
// - المبلغ (أخضر للإيداع + / أحمر للخصم -)
// - الرصيد بعد العملية
// - الحالة badge (COMPLETED/PENDING/FAILED)
```

#### pricing-table.tsx
```typescript
// جدول تسعير الرسائل
interface PricingTableProps {
  pricing: MessagePricing[];
}

// يعرض أنواع المحادثات وأسعارها
// مع tooltip يشرح كل نوع
```

### 9.4 Hooks

```typescript
// hooks/use-wallet.ts

// ═══ Queries ═══
export function useWallet() {
  return useQuery({
    queryKey: ['wallet'],
    queryFn: () => walletApi.getWallet().then(r => r.data),
  });
}

export function useWalletTransactions(params?: { page?: number; type?: string; from?: string; to?: string }) {
  return useQuery({
    queryKey: ['wallet-transactions', params],
    queryFn: () => walletApi.getTransactions(params).then(r => r.data),
  });
}

export function useAutoRecharge() {
  return useQuery({
    queryKey: ['auto-recharge'],
    queryFn: () => walletApi.getAutoRecharge().then(r => r.data),
  });
}

export function useMessagePricing() {
  return useQuery({
    queryKey: ['message-pricing'],
    queryFn: () => walletApi.getPricing().then(r => r.data),
    staleTime: 24 * 60 * 60 * 1000, // 24 ساعة — الأسعار لا تتغير كثيراً
  });
}

// ═══ Mutations ═══
export function useTopUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TopUpRequest) => walletApi.topUp(data).then(r => r.data),
    // لا invalidate هنا — بوابة الدفع external
    // الـ invalidation يحصل بعد verify
  });
}

export function useVerifyTopUp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (txId: string) => walletApi.verifyTopUp(txId).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    },
  });
}

export function useUpdateAutoRecharge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: AutoRechargeSettings) => walletApi.updateAutoRecharge(data).then(r => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auto-recharge'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}
```

### 9.5 تكامل المحفظة مع باقي النظام

```
┌─ Dashboard (الصفحة الرئيسية) ─────────────────────────┐
│  بطاقة إحصائيات جديدة: "الرصيد: 250,000 د.ع"         │
│  تحذير إذا الرصيد منخفض                                │
└────────────────────────────────────────────────────────┘

┌─ WhatsApp Send ────────────────────────────────────────┐
│  عرض تكلفة الرسالة المتوقعة قبل الإرسال               │
│  "تكلفة تقديرية: ~500 د.ع (utility)"                   │
│  إذا الرصيد غير كافٍ → تعطيل الإرسال + رابط شحن       │
└────────────────────────────────────────────────────────┘

┌─ Billing ──────────────────────────────────────────────┐
│  نقل "شحن الرصيد" من Billing إلى Wallet               │
│  Billing = الخطط والفواتير فقط                          │
│  Wallet = الرصيد والمعاملات والشحن                     │
└────────────────────────────────────────────────────────┘

┌─ Activity Panel ───────────────────────────────────────┐
│  إشعار: "رصيدك منخفض: 15,000 د.ع — اشحن الآن"        │
│  إشعار: "تم شحن 100,000 د.ع بنجاح"                    │
│  إشعار: "المحفظة فارغة! الرسائل معلّقة"                │
└────────────────────────────────────────────────────────┘

┌─ Sidebar ──────────────────────────────────────────────┐
│  عنصر جديد: "المحفظة" مع mini badge للرصيد             │
│  ترتيب: ... → الاستخدام → المحفظة → الفوترة          │
└────────────────────────────────────────────────────────┘
```

---

## 10. التوثيق التفاعلي (Interactive Docs)

### 10.1 هيكل صفحة Docs الجديدة

```
/dashboard/docs              ← مركز التوثيق (بطاقات الأقسام)
/dashboard/docs/quick-start  ← دليل البدء السريع (خطوات تفاعلية)
/dashboard/docs/api-reference← مرجع API (كل endpoint مع أمثلة)
/dashboard/docs/webhooks     ← توثيق Webhooks (أحداث + payloads + أمان)
```

### 10.2 ميزات التفاعلية

```
- أمثلة كود بـ 4 لغات: cURL / JavaScript / Python / PHP
- زر نسخ لكل مثال
- API Key placeholder يتحول لمفتاح حقيقي إذا موجود
- Phone Number ID placeholder يتحول لرقم حقيقي إذا مربوط
- Try it: إمكانية إرسال طلب حقيقي من صفحة التوثيق (المرحلة 3)
```

---

## 11. تحسينات UX/UI

### 11.1 Loading States

كل صفحة يجب أن تدعم 4 حالات:

```
1. Loading   → Skeleton يطابق layout الصفحة النهائي
2. Error     → رسالة خطأ + زر إعادة المحاولة
3. Empty     → Empty State مع icon + وصف + CTA
4. Data      → العرض الطبيعي
```

### 11.2 Toast Notifications (Sonner)

```
✅ نجاح: "تم إنشاء مفتاح API بنجاح"
✅ نجاح: "تم إرسال الرسالة بنجاح — msg_xxx"
✅ نجاح: "تم إنشاء القالب وهو قيد المراجعة"
✅ نجاح: "تم شحن 100,000 د.ع بنجاح"
❌ خطأ:  "فشل الإرسال: The phone number is not a valid WhatsApp number"
❌ خطأ:  "فشل الشحن: تم رفض عملية الدفع"
⚠️ تحذير: "وصلت لحد الرسائل الشهري. قم بالترقية"
⚠️ تحذير: "رصيدك منخفض: 15,000 د.ع — اشحن الآن"
📋 نسخ:  "تم نسخ المفتاح"
```

### 11.3 Optimistic Updates

```
- إلغاء API Key → يختفي فوراً من القائمة (مع rollback عند الفشل)
- حذف جهة اتصال → تختفي فوراً
- Mark notification as read → يتحدث فوراً
```

### 11.4 Form Validation (Zod)

```
- إنشاء API Key: name (مطلوب, 3-50 حرف), scopes (1+ مطلوب)
- إرسال رسالة: phone (regex دولي), message (مطلوب)
- إنشاء Webhook: url (HTTPS مطلوب, valid URL), events (1+ مطلوب)
- إنشاء Contact: phoneNumber (regex), name (اختياري), email (email format)
- إنشاء Template: name (a-z_0-9, 3-60 حرف), bodyText (مطلوب)
- شحن رصيد: amount (مطلوب, minimum: 10,000 د.ع), paymentMethod (مطلوب)
- شحن تلقائي: threshold (> 0), amount (≥ 10,000), amount > threshold
```

### 11.5 Keyboard Shortcuts

```
⌘K / Ctrl+K → Command Palette (بحث سريع في الصفحات)   — المرحلة 3
Esc         → إغلاق Dialog/Sheet
```

---

## 12. هيكل الملفات النهائي

```
apps/developers/
│
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   │
│   ├── (auth)/                                    [بدون تغيير]
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   ├── callback/page.tsx
│   │   ├── check-email/page.tsx
│   │   ├── complete-profile/page.tsx
│   │   ├── verify-identity/page.tsx
│   │   └── auth/verify-2fa/page.tsx
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx                             [بدون تغيير]
│   │   └── dashboard/
│   │       ├── page.tsx                           ✏️ ديناميكي
│   │       │
│   │       ├── api-keys/
│   │       │   └── page.tsx                       ✏️ ديناميكي + dialogs
│   │       │
│   │       ├── whatsapp/
│   │       │   ├── page.tsx                       ✏️ overview + embedded signup
│   │       │   ├── accounts/
│   │       │   │   └── page.tsx                   🆕 WABA + phone numbers
│   │       │   ├── send/
│   │       │   │   └── page.tsx                   ✏️ حقيقي + type selector
│   │       │   ├── templates/
│   │       │   │   ├── page.tsx                   ✏️ ديناميكي + filters
│   │       │   │   └── create/
│   │       │   │       └── page.tsx               🆕 template builder
│   │       │   ├── contacts/
│   │       │   │   └── page.tsx                   ✏️ ديناميكي + pagination
│   │       │   ├── webhooks/
│   │       │   │   └── page.tsx                   ✏️ ديناميكي + dialogs
│   │       │   └── logs/
│   │       │       └── page.tsx                   ✏️ ديناميكي + filters
│   │       │
│   │       ├── usage/
│   │       │   └── page.tsx                       ✏️ ديناميكي + charts
│   │       │
│   │       ├── wallet/
│   │       │   └── page.tsx                       🆕 المحفظة + شحن + سجل معاملات
│   │       │
│   │       ├── billing/
│   │       │   └── page.tsx                       ✏️ ديناميكي + 4 plans
│   │       │
│   │       └── docs/
│   │           ├── page.tsx                       ✏️ links إلى sub-pages
│   │           ├── quick-start/
│   │           │   └── page.tsx                   🆕 interactive guide
│   │           ├── api-reference/
│   │           │   └── page.tsx                   🆕 full API docs
│   │           └── webhooks/
│   │               └── page.tsx                   🆕 webhook events docs
│   │
│   └── api/
│       ├── auth/[...path]/route.ts                [بدون تغيير]
│       └── developer/[...path]/route.ts           🆕 BFF Proxy
│
├── components/
│   ├── icons.tsx                                  [بدون تغيير]
│   │
│   ├── ui/                                        [بدون تغيير — 22 Shadcn]
│   │   └── ...
│   │
│   ├── dashboard/
│   │   ├── sidebar.tsx                            ✏️ NAV_ITEMS updated
│   │   ├── dashboard-nav.tsx                      ✏️ labelMap updated
│   │   ├── activity-panel.tsx                     ✏️ real notifications
│   │   └── welcome-banner.tsx                     ✏️ onboarding steps
│   │
│   ├── whatsapp/                                  🆕 7 components
│   │   ├── embedded-signup-button.tsx
│   │   ├── waba-status-card.tsx
│   │   ├── phone-number-card.tsx
│   │   ├── message-composer.tsx
│   │   ├── template-builder.tsx
│   │   ├── template-preview.tsx
│   │   └── message-status-badge.tsx
│   │
│   ├── api-keys/                                  🆕 3 components
│   │   ├── create-key-dialog.tsx
│   │   ├── key-card.tsx
│   │   └── key-revealed-dialog.tsx
│   │
│   ├── contacts/                                  🆕 2 components
│   │   ├── create-contact-dialog.tsx
│   │   └── contact-card.tsx
│   │
│   ├── webhooks/                                  🆕 2 components
│   │   ├── create-webhook-dialog.tsx
│   │   └── webhook-card.tsx
│   │
│   ├── billing/                                   🆕 2 components
│   │   ├── plan-card.tsx
│   │   └── invoice-row.tsx
│   │
│   ├── wallet/                                    🆕 5 components
│   │   ├── balance-card.tsx
│   │   ├── top-up-dialog.tsx
│   │   ├── auto-recharge-dialog.tsx
│   │   ├── transaction-row.tsx
│   │   └── pricing-table.tsx
│   │
│   └── shared/                                    🆕 8 components
│       ├── empty-state.tsx
│       ├── loading-skeleton.tsx
│       ├── error-state.tsx
│       ├── pagination.tsx
│       ├── confirm-dialog.tsx
│       ├── code-block.tsx
│       ├── stats-card.tsx
│       └── usage-bar.tsx
│
├── hooks/                                         🆕 12 hooks
│   ├── use-api-keys.ts
│   ├── use-waba.ts
│   ├── use-phone-numbers.ts
│   ├── use-messages.ts
│   ├── use-templates.ts
│   ├── use-contacts.ts
│   ├── use-webhooks.ts
│   ├── use-usage.ts
│   ├── use-subscription.ts
│   ├── use-wallet.ts
│   ├── use-logs.ts
│   └── use-notifications.ts
│
├── lib/
│   ├── api-client.ts                              [بدون تغيير]
│   ├── config.ts                                  [بدون تغيير]
│   ├── utils.ts                                   [بدون تغيير]
│   └── api/
│       ├── auth.ts                                [بدون تغيير]
│       ├── developer.ts                           🆕 API Keys + Sub + Usage
│       ├── whatsapp.ts                            🆕 WABA + Msgs + Templates
│       ├── wallet.ts                              🆕 محفظة + شحن + معاملات
│       ├── contacts.ts                            🆕
│       ├── webhooks.ts                            🆕
│       └── types.ts                               🆕 all TypeScript interfaces
│
├── providers/
│   ├── auth-provider.tsx                          [بدون تغيير]
│   └── query-provider.tsx                         ✏️ improved config
│
└── public/
    └── svg-dev/                                   [بدون تغيير]
```

### ملخص العدد

| النوع | جديد 🆕 | تعديل ✏️ | بدون تغيير | الإجمالي |
|-------|---------|----------|-----------|---------|
| صفحات | 5 | 11 | 7 (auth) | 23 |
| مكوّنات | 24 | 4 | 23 (ui+icons) | 51 |
| Hooks | 11 | 0 | 0 | 11 |
| API functions | 5 ملفات | 0 | 2 | 7 |
| API routes | 1 | 0 | 1 | 2 |
| **الإجمالي** | **~46 ملف** | **~15 ملف** | **~33 ملف** | **~94 ملف** |

---

## 13. مراحل التنفيذ التفصيلية

### المرحلة 1 — البنية التحتية + الصفحات الحرجة (أسبوعان)

**الهدف:** كل شيء متصل — المطوّر يمكنه ربط WhatsApp وإنشاء مفتاح وإرسال رسالة

| الأسبوع | المهام |
|---------|--------|
| **الأسبوع 1** | |
| | 1. إنشاء `lib/api/types.ts` — كل الـ interfaces |
| | 2. إنشاء `lib/api/developer.ts` — API Keys + Subscription + Usage |
| | 3. إنشاء `lib/api/whatsapp.ts` — WABA + Messages + Templates |
| | 4. إنشاء `app/api/developer/[...path]/route.ts` — BFF Proxy |
| | 5. إنشاء `hooks/use-api-keys.ts` |
| | 6. إنشاء `hooks/use-waba.ts` + `hooks/use-phone-numbers.ts` |
| | 7. إنشاء `hooks/use-usage.ts` + `hooks/use-subscription.ts` |
| | 8. إنشاء `components/shared/` — empty-state, loading-skeleton, error-state, confirm-dialog |
| **الأسبوع 2** | |
| | 9. إنشاء `components/api-keys/` — create-key-dialog, key-card, key-revealed-dialog |
| | 10. تحويل `api-keys/page.tsx` → ديناميكي |
| | 11. إنشاء `components/whatsapp/embedded-signup-button.tsx` |
| | 12. إنشاء `components/whatsapp/waba-status-card.tsx` + `phone-number-card.tsx` |
| | 13. إنشاء `/dashboard/whatsapp/page.tsx` — overview + embedded signup |
| | 14. إنشاء `/dashboard/whatsapp/accounts/page.tsx` — WABA + phones |
| | 15. تحويل `/dashboard/whatsapp/send/page.tsx` → إرسال حقيقي |
| | 16. تحديث `sidebar.tsx` — nav items جديدة |
| | 17. تحديث `dashboard-nav.tsx` — labels جديدة |

---

### المرحلة 2 — الصفحات الكاملة + UX (أسبوعان)

**الهدف:** كل الصفحات تعمل ديناميكياً مع تجربة UX متكاملة

| الأسبوع | المهام |
|---------|--------|
| **الأسبوع 3** | |
| | 18. إنشاء `lib/api/contacts.ts` + `hooks/use-contacts.ts` |
| | 19. إنشاء `lib/api/webhooks.ts` + `hooks/use-webhooks.ts` |
| | 20. إنشاء `hooks/use-templates.ts` + `hooks/use-messages.ts` + `hooks/use-logs.ts` |
| | 21. إنشاء `components/contacts/` — dialogs |
| | 22. إنشاء `components/webhooks/` — dialogs |
| | 23. تحويل `contacts/page.tsx` → ديناميكي + dialog + pagination |
| | 24. تحويل `webhooks/page.tsx` → ديناميكي + dialog |
| | 25. تحويل `templates/page.tsx` → ديناميكي + filters |
| | 26. إنشاء `templates/create/page.tsx` — template builder + preview |
| **الأسبوع 4** | |
| | 27. تحويل `logs/page.tsx` → ديناميكي + فلاتر + pagination |
| | 28. تحويل `usage/page.tsx` → ديناميكي + charts |
| | 29. تحويل `billing/page.tsx` → ديناميكي + 4 خطط (بدون top-up — انتقل للمحفظة) |
| | 30. تحويل `dashboard/page.tsx` → بيانات حقيقية + بطاقة رصيد المحفظة |
| | 31. تحويل `activity-panel.tsx` → إشعارات حقيقية (بما فيها إشعارات المحفظة) |
| | 32. تحديث `welcome-banner.tsx` — onboarding خطوات ذكية (شحن المحفظة كخطوة) |
| | 33. إنشاء `components/wallet/auto-recharge-dialog.tsx` |
| | 34. إنشاء `components/shared/pagination.tsx` + `code-block.tsx` + `stats-card.tsx` + `usage-bar.tsx` |

---

### المرحلة 3 — التوثيق + التحسينات (أسبوع واحد)

**الهدف:** تجربة مطوّر احترافية كاملة

| # | المهمة |
|---|--------|
| 35 | تحديث `docs/page.tsx` — روابط للصفحات الفرعية |
| 36 | إنشاء `docs/quick-start/page.tsx` — دليل تفاعلي (مع خطوة شحن المحفظة) |
| 37 | إنشاء `docs/api-reference/page.tsx` — مرجع API كامل |
| 38 | إنشاء `docs/webhooks/page.tsx` — أحداث + payloads + أمان |
| 39 | تحديث `query-provider.tsx` — تحسين config (staleTime, gcTime) |
| 40 | إضافة Toast notifications (Sonner) لكل عملية (بما فيها المحفظة) |
| 41 | إضافة Zod validation لكل form (بما فيها شحن الرصيد + الشحن التلقائي) |
| 42 | اختبار responsive (mobile + tablet + desktop) |
| 43 | اختبار RTL + dark mode لكل صفحة جديدة |

---

## 14. المهام الدقيقة (Task Breakdown)

### ملخص إجمالي

| الفئة | عدد المهام | الأولوية |
|-------|-----------|----------|
| البنية التحتية (types, API, BFF, hooks) | 13 | 🔴 حرجة |
| المكوّنات المشتركة | 8 | 🔴 حرجة |
| مكوّنات API Keys | 3 + 1 صفحة | 🔴 حرجة |
| مكوّنات WhatsApp | 7 + 3 صفحات | 🔴 حرجة |
| مكوّنات المحفظة (Wallet) | 5 + 1 صفحة | 🔴 حرجة |
| تحويل الصفحات الثابتة | 8 صفحات | 🟡 عالية |
| مكوّنات Contacts | 2 + 1 صفحة | 🟡 عالية |
| مكوّنات Webhooks | 2 + 1 صفحة | 🟡 عالية |
| مكوّنات Billing | 2 + 1 صفحة | 🟡 عالية |
| صفحات التوثيق | 3 صفحات | 🟢 متوسطة |
| تحسينات UX (toasts, validation) | 5 | 🟢 متوسطة |
| تحديث المكوّنات الموجودة | 4 | 🟡 عالية |
| **الإجمالي** | **~48 مهمة** | |

### ترتيب التنفيذ المقترح (Dependency Order)

```
الطبقة 0: types.ts (لا تبعيات)
    ↓
الطبقة 1: API functions (developer.ts, whatsapp.ts, wallet.ts, contacts.ts, webhooks.ts)
    ↓
الطبقة 2: BFF Proxy (developer/[...path]/route.ts)
    ↓
الطبقة 3: React Query Hooks (use-api-keys, use-waba, use-wallet, use-messages, etc.)
    ↓
الطبقة 4: Shared Components (empty-state, loading-skeleton, confirm-dialog, etc.)
    ↓
الطبقة 5: Feature Components (api-keys/, whatsapp/, wallet/, contacts/, webhooks/, billing/)
    ↓
الطبقة 6: Page Updates (كل صفحة تستخدم hooks + components)
    ↓
الطبقة 7: Sidebar/Nav/Activity Panel updates
    ↓
الطبقة 8: Docs pages
    ↓
الطبقة 9: UX polish (toasts, validation, animations)
```

---

## ملاحظات ختامية

### التوافق

- **لا تعارض** مع نظام Auth الحالي — يبقى كما هو
- **API Client الحالي** (`lib/api-client.ts`) يُستخدم كما هو في كل API functions الجديدة
- **React Query Provider** موجود ومُعدّ — فقط يحتاج تعديل طفيف في config
- **Shadcn Components** (22 مكوّن) كلها جاهزة وتُستخدم في المكوّنات الجديدة
- **Sonner** (toast) مُثبّت وجاهز للاستخدام

### قاعدة ذهبية

```
كل صفحة يجب أن تعمل في 3 سيناريوهات:

1. مستخدم جديد (لا WABA, لا API Keys, لا بيانات)
   → Empty State + CTA واضح

2. مستخدم أجرى الإعداد لكنه لا يوجد بيانات بعد
   → Empty State مختلف + نصائح

3. مستخدم نشط مع بيانات
   → العرض الكامل + إحصائيات + إجراءات
```

### البيئة المطلوبة

```env
# .env.local — developers app
NEXT_PUBLIC_WHATSAPP_APP_ID=              # Meta App ID
NEXT_PUBLIC_WHATSAPP_CONFIG_ID=           # Embedded Signup Config ID
API_BACKEND_URL=http://localhost:3001     # (موجود)
```

# 📱 خطة بناء Rukny WhatsApp Tech Provider Platform

> **الهدف:** تحويل Rukny.io إلى مزوّد خدمة WhatsApp Business API (مثل YCloud) حيث يقوم المطوّرون بإضافة حساب WhatsApp Business، ربط رقمهم، وإرسال الرسائل عبر API بسيط وآمن.

> **التاريخ:** أبريل 2026

---

## 📑 فهرس المحتويات

1. [نظرة عامة على المشروع](#1-نظرة-عامة-على-المشروع)
2. [تحليل الوضع الحالي](#2-تحليل-الوضع-الحالي)
3. [البنية المعمارية الجديدة](#3-البنية-المعمارية-الجديدة)
4. [قاعدة البيانات — النماذج الجديدة](#4-قاعدة-البيانات--النماذج-الجديدة)
5. [API Backend — الخدمات والوحدات](#5-api-backend--الخدمات-والوحدات)
6. [Developers Portal — إعادة هيكلة الواجهة](#6-developers-portal--إعادة-هيكلة-الواجهة)
7. [نظام API Keys](#7-نظام-api-keys)
8. [نظام Embedded Signup — ربط رقم WhatsApp](#8-نظام-embedded-signup--ربط-رقم-whatsapp)
9. [WhatsApp Messaging API](#9-whatsapp-messaging-api)
10. [نظام Templates](#10-نظام-templates)
11. [نظام Webhooks](#11-نظام-webhooks)
12. [نظام الحصص والفوترة](#12-نظام-الحصص-والفوترة)
13. [نظام السجلات والتحليلات](#13-نظام-السجلات-والتحليلات)
14. [الأمان](#14-الأمان)
15. [مراحل التنفيذ](#15-مراحل-التنفيذ)
16. [هيكل ملفات المشروع النهائي](#16-هيكل-ملفات-المشروع-النهائي)

---

## 1. نظرة عامة على المشروع

### الرؤية

Rukny.io كـ **WhatsApp Technology Provider** (مزوّد تقنية معتمد من Meta) يتيح للمطوّرين والشركات:

```
1. إنشاء حساب مطوّر على developers.rukny.io
2. إنشاء API Key للوصول إلى الـ API
3. ربط رقم WhatsApp Business عبر Meta Embedded Signup
4. إرسال واستقبال رسائل WhatsApp عبر REST API
5. إدارة Templates، جهات الاتصال، Webhooks
6. مراقبة الاستخدام والفوترة
```

### المقارنة مع YCloud

| الميزة | YCloud | Rukny (المخطط) |
|--------|--------|----------------|
| Embedded Signup | ✅ | ✅ |
| Send Message API | ✅ | ✅ |
| Template Management | ✅ | ✅ |
| Webhook Events | ✅ | ✅ |
| Contact Management | ✅ | ✅ |
| Message Logs | ✅ | ✅ |
| API Keys | ✅ | ✅ |
| Usage & Billing | ✅ | ✅ |
| Developer Docs | ✅ | ✅ |
| Multi-language SDKs | ✅ | المرحلة 3 |
| Campaign/Bulk Send | ✅ | المرحلة 2 |
| Inbox (محادثات) | ✅ | المرحلة 3 |
| Chatbot Builder | ✅ | المرحلة 3 |

---

## 2. تحليل الوضع الحالي

### ما هو موجود ويعمل

| المكوّن | الحالة | الملفات |
|---------|--------|---------|
| WhatsApp Personal API (technoplus) | ✅ يعمل | `src/integrations/whatsapp/` |
| WhatsApp Business API (Meta Cloud) | ✅ يعمل | `src/integrations/whatsapp-business/` |
| إرسال OTP عبر WhatsApp | ✅ يعمل | `checkout-auth.service.ts` |
| تتبع الطلبات عبر OTP | ✅ يعمل | `order-tracking.service.ts` |
| Prisma: WhatsappOtp, WhatsappNotification | ✅ يعمل | `schema.prisma` |
| Developers Portal (واجهة ثابتة) | ✅ واجهة فقط | `apps/developers/` |
| Auth Flow (OAuth + Magic Link + 2FA) | ✅ يعمل | `apps/developers/providers/` |
| BFF Proxy (auth routes) | ✅ يعمل | `apps/developers/app/api/auth/` |

### ما هو مخطط لكن غير منفّذ

| المكوّن | الوثيقة | الملاحظة |
|---------|---------|----------|
| Merchant Phone Connection | `WHATSAPP_INTEGRATION.md` | تصميم مفصّل موجود |
| MerchantWhatsappAccount model | `WHATSAPP_INTEGRATION.md` | Prisma schema مقترح |
| Quota System | `WHATSAPP_INTEGRATION.md` | تصميم كامل |
| BullMQ Queue | `WHATSAPP_INTEGRATION.md` | مقترح |
| Webhook Signature Verification | `WHATSAPP_INTEGRATION.md` | مقترح |
| Message Logging | `WHATSAPP_INTEGRATION.md` | Prisma models مقترحة |

### ما يحتاج بناء من الصفر

| المكوّن | الأولوية |
|---------|----------|
| Developer API Key system | 🔴 حرجة |
| Developer-specific subscription/billing | 🔴 حرجة |
| Public WhatsApp REST API للمطوّرين | 🔴 حرجة |
| WABA Management API | 🔴 حرجة |
| Phone Number Registration API | 🔴 حرجة |
| Developer Webhook system | 🟡 عالية |
| Template Management API | 🟡 عالية |
| Contact Management API | 🟡 عالية |
| Rate Limiting per API Key | 🟡 عالية |
| Developer Portal (واجهة ديناميكية) | 🟡 عالية |
| Developer Documentation (interactive) | 🟢 متوسطة |
| SDKs (JS/Python/PHP) | 🔵 منخفضة |

---

## 3. البنية المعمارية الجديدة

### المخطط العام

```
┌──────────────────────────────────────────────────────────────────┐
│                     developers.rukny.io                          │
│                   (Next.js 16 — Port 3004)                       │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Dashboard │ │ WhatsApp │ │ API Keys │ │  Billing │           │
│  │  الرئيسية │ │  إدارة   │ │  مفاتيح  │ │  فوترة   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │  Docs    │ │  Usage   │ │ Templates│ │ Webhooks │           │
│  │  توثيق   │ │ استخدام  │ │  قوالب   │ │ خطافات  │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└──────────────────────┬───────────────────────────────────────────┘
                       │ BFF Proxy
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    api.rukny.io                                   │
│                 (NestJS — Port 3001)                              │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Developer Domain (جديد)                     │    │
│  │                                                         │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │    │
│  │  │ API Keys    │  │ Dev Billing  │  │ Dev Webhooks  │ │    │
│  │  │ إنشاء/إدارة │  │ حصص/فوترة   │  │ إدارة خطافات │ │    │
│  │  └─────────────┘  └──────────────┘  └───────────────┘ │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │          WhatsApp Provider Domain (جديد)                 │    │
│  │                                                         │    │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────────────┐│    │
│  │  │ WABA Mgmt  │ │ Messaging  │ │ Template Management ││    │
│  │  │ إدارة WABA │ │ إرسال رسائل│ │ إدارة القوالب       ││    │
│  │  └────────────┘ └────────────┘ └─────────────────────┘│    │
│  │  ┌────────────┐ ┌────────────┐ ┌─────────────────────┐│    │
│  │  │ Phone Mgmt │ │ Contacts   │ │ Webhook Delivery    ││    │
│  │  │ إدارة أرقام│ │ جهات اتصال│ │ توصيل الأحداث      ││    │
│  │  └────────────┘ └────────────┘ └─────────────────────┘│    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────────────┐      │
│  │ BullMQ Queue│  │  Redis   │  │ Meta Graph API Proxy  │      │
│  │ طابور رسائل│  │ تخزين مؤقت│  │ وسيط Meta API       │      │
│  └─────────────┘  └──────────┘  └───────────────────────┘      │
└────────────────────────────┬─────────────────────────────────────┘
                             │
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Meta Cloud API                                 │
│              graph.facebook.com/v21.0                             │
│                                                                  │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │
│  │ Messages │ │Templates │ │  Phone   │ │ Webhooks │           │
│  │  رسائل  │ │  قوالب   │ │  أرقام  │ │ أحداث   │           │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │
└──────────────────────────────────────────────────────────────────┘
```

### تدفق الطلبات

```
المطوّر → API Request (مع API Key)
    ↓
API Gateway (Rate Limit + API Key Validation)
    ↓
WhatsApp Provider Controller
    ↓
Quota Check (هل لديه رصيد كافٍ؟)
    ↓
BullMQ Queue (لضمان عدم تجاوز Rate Limits)
    ↓
Meta Graph API (graph.facebook.com)
    ↓
Response → Message Log → Webhook Event → المطوّر
```

---

## 4. قاعدة البيانات — النماذج الجديدة

### 4.1 مفتاح API للمطوّر

```prisma
model DeveloperApiKey {
  id              String            @id @default(uuid())
  userId          String
  
  name            String            // اسم وصفي: "Production Key"
  keyPrefix       String            // أول 8 أحرف: "rk_live_"
  keyHash         String            @unique  // SHA-256 hash للمفتاح الكامل
  lastFourChars   String            // آخر 4 أحرف للعرض
  
  // الصلاحيات
  scopes          String[]          // ["whatsapp:send", "whatsapp:templates", "contacts:read"]
  
  // الحالة
  status          ApiKeyStatus      @default(ACTIVE)
  lastUsedAt      DateTime?
  lastUsedIp      String?
  expiresAt       DateTime?
  
  // Rate Limiting
  rateLimit       Int               @default(60)  // طلب/دقيقة
  dailyLimit      Int               @default(10000)
  
  createdAt       DateTime          @default(now())
  revokedAt       DateTime?
  
  user            User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  usageLogs       ApiRequestLog[]
  
  @@index([keyHash])
  @@index([userId, status])
  @@map("developer_api_keys")
}

enum ApiKeyStatus {
  ACTIVE
  REVOKED
  EXPIRED
}
```

### 4.2 حساب WhatsApp Business للمطوّر

```prisma
model DeveloperWhatsappAccount {
  id                    String                  @id @default(uuid())
  userId                String
  
  // معلومات WABA من Meta
  wabaId                String                  @unique  // WhatsApp Business Account ID
  wabaName              String?                 // اسم الحساب
  
  // Access Token (مشفّر AES-256)
  accessToken           String
  tokenExpiresAt        DateTime?
  
  // الحالة
  status                WabaAccountStatus       @default(PENDING_SETUP)
  onboardingStep        Int                     @default(0)
  
  // معلومات النشاط التجاري
  businessName          String?
  businessVerified      Boolean                 @default(false)
  
  // Meta Review
  accountReviewStatus   String?                 // APPROVED, PENDING, REJECTED
  
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  
  user                  User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  phoneNumbers          DeveloperPhoneNumber[]
  templates             DeveloperWhatsappTemplate[]
  
  @@index([userId])
  @@map("developer_whatsapp_accounts")
}

enum WabaAccountStatus {
  PENDING_SETUP       // أنشئ لكن لم يكتمل الإعداد
  ACTIVE              // نشط
  SUSPENDED           // معلّق بواسطة Meta
  RESTRICTED          // مقيّد
  DISCONNECTED        // فك الارتباط
}
```

### 4.3 رقم الهاتف المربوط

```prisma
model DeveloperPhoneNumber {
  id                    String                  @id @default(uuid())
  wabaAccountId         String
  
  // معلومات الرقم من Meta
  phoneNumberId         String                  @unique  // Meta Phone Number ID
  phoneNumber           String                  // +9647xxxxxxxxx
  displayPhoneNumber    String                  // الرقم المعروض
  verifiedName          String?                 // الاسم المعتمد من Meta
  
  // الحالة
  status                PhoneNumberStatus       @default(PENDING)
  qualityRating         QualityRating?          
  messagingLimitTier    String?                 // TIER_1K, TIER_10K, TIER_100K, TIER_UNLIMITED
  
  // إعدادات الرقم
  codeVerificationStatus String?                // VERIFIED, NOT_VERIFIED
  nameStatus            String?                 // APPROVED, PENDING, DECLINED
  
  // الإحصائيات
  totalMessagesSent     Int                     @default(0)
  totalMessagesReceived Int                     @default(0)
  lastMessageAt         DateTime?
  
  // Quality Check
  lastQualityCheck      DateTime?
  
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  
  wabaAccount           DeveloperWhatsappAccount @relation(fields: [wabaAccountId], references: [id], onDelete: Cascade)
  messageLogs           WhatsappMessageLog[]
  
  @@index([wabaAccountId])
  @@index([phoneNumber])
  @@map("developer_phone_numbers")
}

enum PhoneNumberStatus {
  PENDING           // قيد التسجيل
  CONNECTED         // مربوط ونشط
  DISCONNECTED      // مفصول
  BANNED            // محظور من Meta
}

enum QualityRating {
  GREEN             // جودة عالية
  YELLOW            // متوسطة
  RED               // منخفضة
  UNKNOWN           // غير معروفة
}
```

### 4.4 قوالب الرسائل

```prisma
model DeveloperWhatsappTemplate {
  id                    String                  @id @default(uuid())
  wabaAccountId         String
  
  // معلومات القالب
  name                  String
  language              String                  // ar, en, etc.
  category              TemplateCategory        
  status                TemplateStatus          @default(PENDING)
  
  // المحتوى
  headerType            String?                 // NONE, TEXT, IMAGE, VIDEO, DOCUMENT
  headerContent         String?
  bodyText              String
  footerText            String?
  buttons               Json?                   // JSON array of buttons
  
  // Meta
  metaTemplateId        String?                 
  rejectionReason       String?
  qualityScore          String?                 // GREEN, YELLOW, RED
  
  createdAt             DateTime                @default(now())
  updatedAt             DateTime                @updatedAt
  
  wabaAccount           DeveloperWhatsappAccount @relation(fields: [wabaAccountId], references: [id], onDelete: Cascade)
  
  @@unique([wabaAccountId, name, language])
  @@index([wabaAccountId, status])
  @@map("developer_whatsapp_templates")
}

enum TemplateCategory {
  AUTHENTICATION
  MARKETING
  UTILITY
}

enum TemplateStatus {
  PENDING
  APPROVED
  REJECTED
  PAUSED
  DISABLED
}
```

### 4.5 سجل الرسائل

```prisma
model WhatsappMessageLog {
  id                    String                  @id @default(uuid())
  userId                String
  phoneNumberId         String                  // DeveloperPhoneNumber
  apiKeyId              String?                 // المفتاح المستخدم
  
  // الرسالة
  direction             MessageDirection
  toNumber              String                  // رقم المستلم
  fromNumber            String                  // رقم المرسل
  messageType           WhatsappMessageType     
  
  // المحتوى
  content               Json?                   // محتوى الرسالة
  templateName          String?
  templateLanguage      String?
  
  // Meta
  metaMessageId         String?                 @unique
  conversationId        String?
  
  // الحالة
  status                MessageLogStatus        @default(ACCEPTED)
  errorCode             String?
  errorMessage          String?
  
  // التكلفة
  pricingModel          String?                 // CBP (conversation-based pricing)
  estimatedCost         Float                   @default(0)
  currency              String                  @default("USD")
  
  // الأوقات
  sentAt                DateTime?
  deliveredAt           DateTime?
  readAt                DateTime?
  failedAt              DateTime?
  
  createdAt             DateTime                @default(now())
  
  user                  User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  phoneNumber           DeveloperPhoneNumber    @relation(fields: [phoneNumberId], references: [id], onDelete: Cascade)
  
  @@index([userId, createdAt])
  @@index([phoneNumberId, createdAt])
  @@index([metaMessageId])
  @@index([status])
  @@index([direction, createdAt])
  @@map("whatsapp_message_logs")
}

enum MessageDirection {
  OUTBOUND    // صادرة
  INBOUND     // واردة
}

enum WhatsappMessageType {
  TEXT
  IMAGE
  VIDEO
  AUDIO
  DOCUMENT
  STICKER
  LOCATION
  CONTACTS
  TEMPLATE
  INTERACTIVE
  REACTION
}

enum MessageLogStatus {
  ACCEPTED      // مقبولة في النظام
  QUEUED        // في الطابور
  SENT          // أُرسلت إلى Meta
  DELIVERED     // وصلت للمستلم
  READ          // قُرئت
  FAILED        // فشلت
}
```

### 4.6 جهات الاتصال

```prisma
model DeveloperContact {
  id              String          @id @default(uuid())
  userId          String
  
  phoneNumber     String
  countryCode     String?
  name            String?
  email           String?
  
  // بيانات مخصصة
  tags            String[]
  customFields    Json?
  
  // WhatsApp
  waProfileName   String?         // اسم بروفايل WhatsApp
  isWaUser        Boolean         @default(false)
  
  // الإحصائيات
  totalMessages   Int             @default(0)
  lastMessageAt   DateTime?
  
  // Opt-in/out
  isOptedIn       Boolean         @default(true)
  optedOutAt      DateTime?
  
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, phoneNumber])
  @@index([userId])
  @@index([phoneNumber])
  @@map("developer_contacts")
}
```

### 4.7 Webhook للمطوّرين

```prisma
model DeveloperWebhook {
  id              String              @id @default(uuid())
  userId          String
  
  url             String
  secret          String              // HMAC signing secret
  
  // الأحداث المشترك بها
  events          String[]            // ["message.sent", "message.delivered", "message.received", ...]
  
  // الحالة
  status          WebhookStatus       @default(ACTIVE)
  
  // الصحة
  successCount    Int                 @default(0)
  failureCount    Int                 @default(0)
  consecutiveFails Int                @default(0)
  lastDeliveryAt  DateTime?
  lastFailureAt   DateTime?
  lastResponseCode Int?
  
  // التلقائي
  disabledAt      DateTime?           // يُعطّل تلقائياً بعد 10 فشل متتالي
  disableReason   String?
  
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
  
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  deliveryLogs    WebhookDeliveryLog[]
  
  @@index([userId, status])
  @@map("developer_webhooks")
}

model WebhookDeliveryLog {
  id              String          @id @default(uuid())
  webhookId       String
  
  eventType       String          // "message.sent", "message.delivered", etc.
  payload         Json            // البيانات المرسلة
  
  // النتيجة
  responseCode    Int?
  responseBody    String?
  duration        Int?            // بالمللي ثانية
  success         Boolean
  errorMessage    String?
  
  // إعادة المحاولة
  attempt         Int             @default(1)
  maxAttempts     Int             @default(3)
  nextRetryAt     DateTime?
  
  createdAt       DateTime        @default(now())
  
  webhook         DeveloperWebhook @relation(fields: [webhookId], references: [id], onDelete: Cascade)
  
  @@index([webhookId, createdAt])
  @@index([success])
  @@map("webhook_delivery_logs")
}

enum WebhookStatus {
  ACTIVE
  DISABLED          // عطّله المطوّر
  AUTO_DISABLED     // تعطّل تلقائياً بسبب فشل متكرر
}
```

### 4.8 سجل طلبات API

```prisma
model ApiRequestLog {
  id              String          @id @default(uuid())
  apiKeyId        String
  userId          String
  
  method          String          // GET, POST, PUT, DELETE
  path            String          // /v1/whatsapp/messages
  statusCode      Int
  
  requestBody     Json?
  responseBody    Json?
  
  ip              String?
  userAgent       String?
  duration        Int?            // بالمللي ثانية
  
  createdAt       DateTime        @default(now())
  
  apiKey          DeveloperApiKey @relation(fields: [apiKeyId], references: [id], onDelete: Cascade)
  
  @@index([apiKeyId, createdAt])
  @@index([userId, createdAt])
  @@index([path, createdAt])
  @@map("api_request_logs")
}
```

### 4.9 اشتراك المطوّر

```prisma
model DeveloperSubscription {
  id                  String                  @id @default(uuid())
  userId              String                  @unique
  
  plan                DeveloperPlan           @default(FREE)
  status              SubscriptionStatus      @default(ACTIVE)
  billingCycle        BillingCycle?
  
  // الفترة
  currentPeriodStart  DateTime                @default(now())
  currentPeriodEnd    DateTime?
  
  // الاستخدام الشهري
  apiCallsUsed        Int                     @default(0)
  messagesUsed        Int                     @default(0)
  
  // الرصيد (Pay-as-you-go)
  balance             Float                   @default(0)   // بالدولار
  
  cancelledAt         DateTime?
  createdAt           DateTime                @default(now())
  updatedAt           DateTime                @updatedAt
  
  user                User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  payments            DeveloperPayment[]
  
  @@map("developer_subscriptions")
}

enum DeveloperPlan {
  FREE          // مجاني: 1000 رسالة/شهر، 1 رقم، 1 API Key
  STARTER       // $29/شهر: 10,000 رسالة، 2 أرقام، 5 API Keys
  GROWTH        // $99/شهر: 100,000 رسالة، 5 أرقام، 10 API Keys
  ENTERPRISE    // مخصص: بلا حدود
}

model DeveloperPayment {
  id              String          @id @default(uuid())
  subscriptionId  String
  
  amount          Float           // بالدولار
  currency        String          @default("USD")
  type            PaymentType     
  status          PaymentStatus
  
  description     String?
  receiptUrl      String?
  metadata        Json?
  
  createdAt       DateTime        @default(now())
  
  subscription    DeveloperSubscription @relation(fields: [subscriptionId], references: [id], onDelete: Cascade)
  
  @@index([subscriptionId])
  @@map("developer_payments")
}

enum PaymentType {
  SUBSCRIPTION      // دفعة اشتراك
  TOP_UP            // شحن رصيد
  OVERAGE           // تجاوز حصة
  REFUND            // استرداد
}
```

### 4.10 حدود الخطط

```typescript
// developer-plan-limits.config.ts

export interface DeveloperPlanLimits {
  maxApiKeys: number;
  maxPhoneNumbers: number;
  maxWebhooks: number;
  maxContacts: number;
  monthlyMessages: number;        // -1 = unlimited
  monthlyApiCalls: number;        // -1 = unlimited
  apiRateLimit: number;           // طلب/دقيقة
  templateManagement: boolean;
  webhookRetries: number;
  logRetentionDays: number;
  priorityQueue: boolean;
  dedicatedSupport: boolean;
}

export const DEVELOPER_PLAN_LIMITS: Record<DeveloperPlan, DeveloperPlanLimits> = {
  FREE: {
    maxApiKeys: 1,
    maxPhoneNumbers: 1,
    maxWebhooks: 2,
    maxContacts: 500,
    monthlyMessages: 1000,
    monthlyApiCalls: 10000,
    apiRateLimit: 30,             // 30 طلب/دقيقة
    templateManagement: true,
    webhookRetries: 1,
    logRetentionDays: 7,
    priorityQueue: false,
    dedicatedSupport: false,
  },
  STARTER: {
    maxApiKeys: 5,
    maxPhoneNumbers: 2,
    maxWebhooks: 5,
    maxContacts: 5000,
    monthlyMessages: 10000,
    monthlyApiCalls: 100000,
    apiRateLimit: 60,
    templateManagement: true,
    webhookRetries: 3,
    logRetentionDays: 30,
    priorityQueue: false,
    dedicatedSupport: false,
  },
  GROWTH: {
    maxApiKeys: 10,
    maxPhoneNumbers: 5,
    maxWebhooks: 10,
    maxContacts: 50000,
    monthlyMessages: 100000,
    monthlyApiCalls: 1000000,
    apiRateLimit: 120,
    templateManagement: true,
    webhookRetries: 5,
    logRetentionDays: 90,
    priorityQueue: true,
    dedicatedSupport: true,
  },
  ENTERPRISE: {
    maxApiKeys: -1,
    maxPhoneNumbers: -1,
    maxWebhooks: -1,
    maxContacts: -1,
    monthlyMessages: -1,
    monthlyApiCalls: -1,
    apiRateLimit: 300,
    templateManagement: true,
    webhookRetries: 5,
    logRetentionDays: 365,
    priorityQueue: true,
    dedicatedSupport: true,
  },
};
```

---

## 5. API Backend — الخدمات والوحدات

### 5.1 هيكل المجلدات الجديدة في API

```
apps/api/src/domain/developer/
├── developer.module.ts
├── api-keys/
│   ├── api-keys.controller.ts
│   ├── api-keys.service.ts
│   ├── dto/
│   │   ├── create-api-key.dto.ts
│   │   └── update-api-key.dto.ts
│   └── guards/
│       └── api-key-auth.guard.ts         ← Guard يتحقق من API Key
├── subscriptions/
│   ├── dev-subscriptions.controller.ts
│   ├── dev-subscriptions.service.ts
│   ├── dev-plan-limits.config.ts
│   └── dto/
│       └── upgrade-plan.dto.ts
├── webhooks/
│   ├── dev-webhooks.controller.ts
│   ├── dev-webhooks.service.ts
│   ├── webhook-delivery.service.ts
│   └── dto/
│       ├── create-webhook.dto.ts
│       └── update-webhook.dto.ts
├── contacts/
│   ├── contacts.controller.ts
│   ├── contacts.service.ts
│   └── dto/
│       ├── create-contact.dto.ts
│       └── update-contact.dto.ts
└── usage/
    ├── usage.controller.ts
    └── usage.service.ts

apps/api/src/domain/whatsapp-provider/
├── whatsapp-provider.module.ts
├── accounts/
│   ├── waba.controller.ts                ← إدارة WABA
│   ├── waba.service.ts
│   ├── embedded-signup.service.ts        ← ربط الحساب عبر Meta
│   └── dto/
│       └── connect-waba.dto.ts
├── phone-numbers/
│   ├── phone-numbers.controller.ts
│   ├── phone-numbers.service.ts
│   └── dto/
│       └── register-phone.dto.ts
├── messaging/
│   ├── messaging.controller.ts           ← Public API: POST /v1/whatsapp/messages
│   ├── messaging.service.ts
│   ├── message-queue.service.ts          ← BullMQ
│   ├── message-processor.service.ts      ← Queue Worker
│   └── dto/
│       ├── send-text.dto.ts
│       ├── send-template.dto.ts
│       ├── send-media.dto.ts
│       └── send-interactive.dto.ts
├── templates/
│   ├── templates.controller.ts
│   ├── templates.service.ts
│   └── dto/
│       ├── create-template.dto.ts
│       └── update-template.dto.ts
├── webhooks/
│   ├── meta-webhook.controller.ts        ← يستقبل من Meta
│   └── meta-webhook.service.ts           ← يوزّع الأحداث للمطوّرين
└── shared/
    ├── meta-api.service.ts               ← وسيط Meta Graph API
    ├── token-encryption.service.ts       ← تشفير/فك تشفير tokens
    └── quota.service.ts                  ← التحقق من الحصص
```

### 5.2 API Endpoints — نقاط النهاية

#### المصادقة الداخلية (JWT — من developers portal)

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| **API Keys** | | |
| POST | `/api/v1/developer/api-keys` | إنشاء مفتاح API |
| GET | `/api/v1/developer/api-keys` | قائمة المفاتيح |
| DELETE | `/api/v1/developer/api-keys/:id` | إلغاء مفتاح |
| PATCH | `/api/v1/developer/api-keys/:id` | تحديث مفتاح (اسم/صلاحيات) |
| **WABA** | | |
| POST | `/api/v1/developer/whatsapp/connect` | بدء ربط WABA (Embedded Signup) |
| GET | `/api/v1/developer/whatsapp/callback` | استقبال callback من Meta |
| GET | `/api/v1/developer/whatsapp/accounts` | قائمة حسابات WABA |
| DELETE | `/api/v1/developer/whatsapp/accounts/:id` | فك الارتباط |
| POST | `/api/v1/developer/whatsapp/accounts/:id/refresh` | تحديث حالة WABA |
| **Phone Numbers** | | |
| GET | `/api/v1/developer/whatsapp/phone-numbers` | قائمة الأرقام |
| POST | `/api/v1/developer/whatsapp/phone-numbers/:id/register` | تسجيل رقم |
| GET | `/api/v1/developer/whatsapp/phone-numbers/:id` | تفاصيل رقم |
| PATCH | `/api/v1/developer/whatsapp/phone-numbers/:id/profile` | تحديث بروفايل الرقم |
| **Subscriptions** | | |
| GET | `/api/v1/developer/subscription` | اشتراكي الحالي |
| GET | `/api/v1/developer/subscription/plans` | الخطط المتاحة |
| POST | `/api/v1/developer/subscription/upgrade` | ترقية الخطة |
| POST | `/api/v1/developer/subscription/top-up` | شحن رصيد |
| **Webhooks** | | |
| POST | `/api/v1/developer/webhooks` | إنشاء webhook |
| GET | `/api/v1/developer/webhooks` | قائمة webhooks |
| PATCH | `/api/v1/developer/webhooks/:id` | تحديث webhook |
| DELETE | `/api/v1/developer/webhooks/:id` | حذف webhook |
| POST | `/api/v1/developer/webhooks/:id/test` | اختبار webhook |
| POST | `/api/v1/developer/webhooks/:id/rotate-secret` | تدوير المفتاح السري |
| **Contacts** | | |
| POST | `/api/v1/developer/contacts` | إنشاء جهة اتصال |
| GET | `/api/v1/developer/contacts` | قائمة جهات الاتصال |
| GET | `/api/v1/developer/contacts/:id` | تفاصيل جهة اتصال |
| PATCH | `/api/v1/developer/contacts/:id` | تحديث جهة اتصال |
| DELETE | `/api/v1/developer/contacts/:id` | حذف جهة اتصال |
| **Usage** | | |
| GET | `/api/v1/developer/usage` | ملخص الاستخدام |
| GET | `/api/v1/developer/usage/daily` | الاستخدام اليومي |
| GET | `/api/v1/developer/usage/messages` | تفاصيل الرسائل |

#### WhatsApp Public API (مصادقة بـ API Key)

هذه هي الـ API التي يستخدمها المطوّر في تطبيقه:

| الطريقة | المسار | الوصف |
|---------|--------|-------|
| **Messages** | | |
| POST | `/v1/whatsapp/messages` | إرسال رسالة (نص/وسائط/قالب/تفاعلي) |
| GET | `/v1/whatsapp/messages/:id` | الحصول على حالة رسالة |
| **Templates** | | |
| POST | `/v1/whatsapp/templates` | إنشاء قالب |
| GET | `/v1/whatsapp/templates` | قائمة القوالب |
| GET | `/v1/whatsapp/templates/:name` | تفاصيل قالب |
| PATCH | `/v1/whatsapp/templates/:name/:language` | تعديل قالب |
| DELETE | `/v1/whatsapp/templates/:name` | حذف قالب |
| **Phone Numbers** | | |
| GET | `/v1/whatsapp/phone-numbers` | قائمة الأرقام |
| GET | `/v1/whatsapp/phone-numbers/:id` | تفاصيل رقم |
| **Contacts** | | |
| POST | `/v1/whatsapp/contacts` | إنشاء/تحديث جهة اتصال |
| GET | `/v1/whatsapp/contacts` | قائمة جهات الاتصال |
| **Media** | | |
| POST | `/v1/whatsapp/media` | رفع ملف وسائط |

### 5.3 مصادقة API Key

```typescript
// guards/api-key-auth.guard.ts

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private prisma: PrismaService,
    private cache: CacheService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);
    
    if (!apiKey) {
      throw new UnauthorizedException('API key required. Pass via X-API-Key header.');
    }
    
    // Hash the key and lookup
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    
    // Check cache first
    const cached = await this.cache.get(`api-key:${keyHash}`);
    let keyRecord: DeveloperApiKey;
    
    if (cached) {
      keyRecord = JSON.parse(cached);
    } else {
      keyRecord = await this.prisma.developerApiKey.findUnique({
        where: { keyHash },
        include: { user: true },
      });
      
      if (keyRecord) {
        await this.cache.set(`api-key:${keyHash}`, JSON.stringify(keyRecord), 300);
      }
    }
    
    if (!keyRecord || keyRecord.status !== 'ACTIVE') {
      throw new UnauthorizedException('Invalid or revoked API key.');
    }
    
    if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
      throw new UnauthorizedException('API key expired.');
    }
    
    // Rate limiting check
    const rateLimitKey = `rate:${keyRecord.id}:${Math.floor(Date.now() / 60000)}`;
    const count = await this.cache.incr(rateLimitKey);
    if (count === 1) await this.cache.expire(rateLimitKey, 60);
    
    if (count > keyRecord.rateLimit) {
      throw new HttpException('Rate limit exceeded', 429);
    }
    
    // Update last used
    this.prisma.developerApiKey.update({
      where: { id: keyRecord.id },
      data: { lastUsedAt: new Date(), lastUsedIp: request.ip },
    }).catch(() => {}); // fire-and-forget
    
    // Attach to request
    request.apiKey = keyRecord;
    request.user = keyRecord.user;
    
    return true;
  }
  
  private extractApiKey(request: Request): string | null {
    // Header: X-API-Key: rk_live_xxxxxxxxxxxx
    return request.headers['x-api-key'] as string || null;
  }
}
```

### 5.4 Send Message API — المثال الرئيسي

```typescript
// messaging.controller.ts

@Controller('v1/whatsapp/messages')
@UseGuards(ApiKeyAuthGuard)
export class MessagingController {
  constructor(
    private messagingService: MessagingService,
    private quotaService: QuotaService,
  ) {}

  /**
   * POST /v1/whatsapp/messages
   * 
   * إرسال رسالة WhatsApp
   * 
   * Headers:
   *   X-API-Key: rk_live_xxxxxxxxxxxx
   * 
   * Body:
   * {
   *   "from": "phone_number_id",
   *   "to": "+9647xxxxxxxxx",
   *   "type": "text",
   *   "text": { "body": "مرحباً!" }
   * }
   */
  @Post()
  async sendMessage(
    @Req() req,
    @Body() body: SendMessageDto,
  ) {
    const userId = req.user.id;
    const apiKeyId = req.apiKey.id;
    
    // 1. التحقق من الحصة
    await this.quotaService.checkAndDeductMessage(userId);
    
    // 2. إرسال الرسالة (عبر Queue)
    const message = await this.messagingService.sendMessage({
      userId,
      apiKeyId,
      phoneNumberId: body.from,
      to: body.to,
      type: body.type,
      content: body[body.type], // text, image, template, etc.
    });
    
    return {
      id: message.id,
      status: message.status,
      from: message.fromNumber,
      to: message.toNumber,
      type: body.type,
      timestamp: message.createdAt,
    };
  }

  @Get(':id')
  async getMessage(@Req() req, @Param('id') id: string) {
    return this.messagingService.getMessageStatus(req.user.id, id);
  }
}
```

### 5.5 Meta Graph API Proxy

```typescript
// shared/meta-api.service.ts

@Injectable()
export class MetaApiService {
  private readonly logger = new Logger(MetaApiService.name);
  private readonly baseUrl = 'https://graph.facebook.com/v21.0';
  
  constructor(
    private tokenEncryption: TokenEncryptionService,
  ) {}

  /**
   * إرسال رسالة عبر Meta Cloud API باستخدام token المطوّر
   */
  async sendMessage(
    encryptedToken: string,
    phoneNumberId: string,
    payload: MetaMessagePayload,
  ): Promise<MetaSendResponse> {
    const accessToken = this.tokenEncryption.decrypt(encryptedToken);
    
    const response = await axios.post(
      `${this.baseUrl}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        ...payload,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000,
      },
    );
    
    return response.data;
  }

  /**
   * إنشاء قالب في Meta
   */
  async createTemplate(
    encryptedToken: string,
    wabaId: string,
    template: CreateTemplatePayload,
  ): Promise<MetaTemplateResponse> {
    const accessToken = this.tokenEncryption.decrypt(encryptedToken);
    
    const response = await axios.post(
      `${this.baseUrl}/${wabaId}/message_templates`,
      template,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    
    return response.data;
  }

  /**
   * الحصول على معلومات رقم
   */
  async getPhoneNumberInfo(
    encryptedToken: string,
    phoneNumberId: string,
  ): Promise<MetaPhoneNumberInfo> {
    const accessToken = this.tokenEncryption.decrypt(encryptedToken);
    
    const response = await axios.get(
      `${this.baseUrl}/${phoneNumberId}`,
      {
        params: {
          fields: 'verified_name,display_phone_number,quality_rating,messaging_limit_tier,code_verification_status,name_status',
        },
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );
    
    return response.data;
  }
}
```

---

## 6. Developers Portal — إعادة هيكلة الواجهة

### 6.1 هيكل الصفحات الجديد

```
apps/developers/app/
├── globals.css
├── layout.tsx
├── page.tsx                              → redirect to /dashboard
│
├── (auth)/                               ← بدون تغيير
│   ├── layout.tsx
│   ├── login/page.tsx
│   ├── callback/page.tsx
│   ├── check-email/page.tsx
│   ├── complete-profile/page.tsx
│   ├── verify-identity/page.tsx
│   └── auth/verify-2fa/page.tsx
│
├── (dashboard)/
│   ├── layout.tsx
│   └── dashboard/
│       ├── page.tsx                      ← الرئيسية (إحصائيات حقيقية)
│       │
│       ├── api-keys/
│       │   └── page.tsx                  ← إدارة مفاتيح API (ديناميكي)
│       │
│       ├── whatsapp/
│       │   ├── page.tsx                  ← 🆕 نظرة عامة + ربط WABA
│       │   ├── accounts/
│       │   │   └── page.tsx              ← 🆕 إدارة حسابات WABA والأرقام
│       │   ├── send/
│       │   │   └── page.tsx              ← إرسال رسالة تجريبية (ديناميكي)
│       │   ├── templates/
│       │   │   ├── page.tsx              ← قائمة القوالب (ديناميكي)
│       │   │   └── create/
│       │   │       └── page.tsx          ← 🆕 إنشاء قالب جديد
│       │   ├── contacts/
│       │   │   └── page.tsx              ← جهات الاتصال (ديناميكي)
│       │   ├── webhooks/
│       │   │   └── page.tsx              ← إدارة Webhooks (ديناميكي)
│       │   └── logs/
│       │       └── page.tsx              ← سجلات الرسائل (ديناميكي)
│       │
│       ├── usage/
│       │   └── page.tsx                  ← استخدام + تحليلات (ديناميكي)
│       │
│       ├── billing/
│       │   └── page.tsx                  ← فوترة المطوّر + الخطط
│       │
│       └── docs/
│           ├── page.tsx                  ← مركز التوثيق
│           ├── quick-start/
│           │   └── page.tsx              ← 🆕 دليل البدء السريع التفاعلي
│           ├── api-reference/
│           │   └── page.tsx              ← 🆕 مرجع API تفاعلي
│           └── webhooks/
│               └── page.tsx              ← 🆕 توثيق Webhooks
│
└── api/
    ├── auth/[...path]/route.ts           ← BFF Proxy (بدون تغيير)
    └── developer/[...path]/route.ts      ← 🆕 BFF Proxy للـ developer APIs
```

### 6.2 الشريط الجانبي المحدّث

```typescript
// تحديث sidebar.tsx — navItems

const navItems = [
  {
    name: 'الرئيسية',
    icon: 'dashboard-dev.svg',
    href: '/dashboard',
  },
  {
    name: 'مفاتيح API',
    icon: 'key-dev.svg',
    href: '/dashboard/api-keys',
  },
  {
    name: 'WhatsApp API',
    icon: 'message-dev.svg',
    href: '/dashboard/whatsapp',
    children: [
      { name: 'نظرة عامة', href: '/dashboard/whatsapp', icon: 'dashboard-dev.svg' },
      { name: 'الحسابات والأرقام', href: '/dashboard/whatsapp/accounts', icon: 'account-dev.svg' },
      { name: 'إرسال رسالة', href: '/dashboard/whatsapp/send', icon: 'send-dev.svg' },
      { name: 'القوالب', href: '/dashboard/whatsapp/templates', icon: 'file-text-dev.svg' },
      { name: 'جهات الاتصال', href: '/dashboard/whatsapp/contacts', icon: 'users-dev.svg' },
      { name: 'Webhooks', href: '/dashboard/whatsapp/webhooks', icon: 'webhook-dev.svg' },
      { name: 'سجل الرسائل', href: '/dashboard/whatsapp/logs', icon: 'scroll-text-dev.svg' },
    ],
  },
  {
    name: 'الاستخدام',
    icon: 'chart-dev.svg',
    href: '/dashboard/usage',
  },
  {
    name: 'الفوترة',
    icon: 'card.svg',
    href: '/dashboard/billing',
  },
  {
    name: 'التوثيق',
    icon: 'book-dev.svg',
    href: '/dashboard/docs',
  },
];
```

### 6.3 صفحة ربط WhatsApp (الأهم)

صفحة `/dashboard/whatsapp` تعمل كنقطة انطلاق:

```
┌─────────────────────────────────────────────────────┐
│  WhatsApp Business API                               │
│                                                     │
│  ┌─ حالة الحساب ────────────────────────────────┐  │
│  │  ❌ لم يتم ربط حساب WhatsApp Business بعد    │  │
│  │                                               │  │
│  │  [🔗 ربط حساب WhatsApp Business]             │  │
│  │                                               │  │
│  │  يتطلب:                                      │  │
│  │  • حساب Meta Business                        │  │
│  │  • رقم هاتف غير مستخدم في WhatsApp العادي    │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ┌─ بدء سريع ────────────────────────────────────┐  │
│  │  1️⃣ اربط حساب WhatsApp Business              │  │
│  │  2️⃣ أنشئ مفتاح API                           │  │
│  │  3️⃣ أرسل أول رسالة                           │  │
│  │                                               │  │
│  │  curl -X POST https://api.rukny.io/v1/...     │  │
│  └───────────────────────────────────────────────┘  │
│                                                     │
│  ── بعد الربط ──                                    │
│                                                     │
│  ┌─ إحصائيات سريعة ──────────────────────────────┐  │
│  │  📤 الرسائل اليوم: 156                        │  │
│  │  ✅ معدل التوصيل: 98.5%                       │  │
│  │  📱 الأرقام النشطة: 1                         │  │
│  │  📋 القوالب المعتمدة: 5                       │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### 6.4 BFF Proxy للمطوّرين

```typescript
// apps/developers/app/api/developer/[...path]/route.ts

import { NextRequest, NextResponse } from 'next/server';

const API_BACKEND_URL = process.env.API_BACKEND_URL || 'http://localhost:3001';

const ALLOWED_PATHS = [
  'api-keys',
  'whatsapp',
  'subscription',
  'webhooks',
  'contacts', 
  'usage',
];

async function handler(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  
  // Validate path prefix
  const isAllowed = ALLOWED_PATHS.some(p => path.startsWith(p));
  if (!isAllowed) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  
  const targetUrl = `${API_BACKEND_URL}/api/v1/developer/${path}`;
  
  const headers = new Headers();
  // Forward auth cookies
  const cookie = req.headers.get('cookie');
  if (cookie) headers.set('cookie', cookie);
  headers.set('content-type', req.headers.get('content-type') || 'application/json');
  headers.set('x-csrf-token', req.headers.get('x-csrf-token') || '');
  
  const response = await fetch(targetUrl, {
    method: req.method,
    headers,
    body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
  });
  
  const data = await response.text();
  
  const res = new NextResponse(data, {
    status: response.status,
    headers: { 'content-type': response.headers.get('content-type') || 'application/json' },
  });
  
  // Forward Set-Cookie
  const setCookie = response.headers.getSetCookie();
  setCookie.forEach(c => res.headers.append('set-cookie', c));
  
  return res;
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
export const PATCH = handler;
export const DELETE = handler;
```

---

## 7. نظام API Keys

### 7.1 آلية إنشاء المفتاح

```
1. المطوّر يطلب إنشاء مفتاح جديد
2. النظام يولّد: rk_live_ + 40 أحرف عشوائية (crypto.randomBytes)
3. يُعرض المفتاح الكامل مرة واحدة فقط
4. يُخزّن: SHA-256(key) + أول 8 أحرف + آخر 4 أحرف
5. المطوّر يستخدم: X-API-Key: rk_live_<YOUR_KEY_HERE>
```

### 7.2 أنواع المفاتيح

| البادئة | البيئة | الاستخدام |
|---------|--------|-----------|
| `rk_live_` | إنتاج | رسائل حقيقية |
| `rk_test_` | اختبار | Sandbox بدون إرسال فعلي |

### 7.3 الصلاحيات (Scopes)

```typescript
enum ApiKeyScope {
  'whatsapp:send'         // إرسال رسائل
  'whatsapp:read'         // قراءة حالة الرسائل
  'whatsapp:templates'    // إدارة القوالب
  'whatsapp:phone'        // إدارة الأرقام
  'contacts:write'        // إدارة جهات الاتصال
  'contacts:read'         // قراءة جهات الاتصال
  'webhooks:manage'       // إدارة Webhooks
  'media:upload'          // رفع وسائط
}
```

---

## 8. نظام Embedded Signup — ربط رقم WhatsApp

### 8.1 التدفق الكامل

```
┌──────────────┐     ┌────────────────┐     ┌──────────────┐
│  developers  │     │   api.rukny.io │     │  Meta/Facebook│
│  .rukny.io   │     │                │     │              │
└──────┬───────┘     └───────┬────────┘     └──────┬───────┘
       │                     │                      │
       │ 1. Click "ربط حساب" │                      │
       │─────────────────────>                      │
       │                     │                      │
       │ 2. Redirect URL     │                      │
       │<─────────────────────                      │
       │                     │                      │
       │ 3. Open Meta Embedded Signup popup         │
       │──────────────────────────────────────────>│
       │                     │                      │
       │                     │  4. User grants      │
       │                     │     permissions      │
       │                     │                      │
       │ 5. Callback with authorization code        │
       │<──────────────────────────────────────────│
       │                     │                      │
       │ 6. Send code to API │                      │
       │─────────────────────>                      │
       │                     │ 7. Exchange code     │
       │                     │    for token         │
       │                     │─────────────────────>│
       │                     │                      │
       │                     │ 8. Access token      │
       │                     │<─────────────────────│
       │                     │                      │
       │                     │ 9. Get WABA ID       │
       │                     │    & Phone Numbers   │
       │                     │─────────────────────>│
       │                     │                      │
       │                     │ 10. WABA + Phone info│
       │                     │<─────────────────────│
       │                     │                      │
       │                     │ 11. Encrypt token    │
       │                     │     Save to DB       │
       │                     │     Subscribe webhook│
       │                     │                      │
       │ 12. Success response│                      │
       │<─────────────────────                      │
       │                     │                      │
```

### 8.2 متطلبات Meta

```env
# .env — متطلبات مزوّد التقنية
WHATSAPP_APP_ID=                    # App ID من Meta Developer Console
WHATSAPP_APP_SECRET=                # App Secret
WHATSAPP_CONFIG_ID=                 # Embedded Signup Configuration ID
WHATSAPP_WEBHOOK_VERIFY_TOKEN=      # رمز تحقق Webhook (أنت تختاره)
WHATSAPP_WEBHOOK_SECRET=            # App Secret لتحقق التوقيع
ENCRYPTION_KEY=                     # مفتاح تشفير tokens (32 بايت)
```

### 8.3 اشتراك Webhook مع Meta

بعد ربط كل حساب WABA، النظام يشترك تلقائياً:

```typescript
// الاشتراك بالأحداث لكل WABA
async subscribeToWebhooks(wabaId: string, accessToken: string) {
  await axios.post(
    `${META_API}/${wabaId}/subscribed_apps`,
    {},
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
}
```

### 8.4 استقبال Webhook من Meta

```
Meta يرسل → POST https://api.rukny.io/webhooks/whatsapp
                   │
                   ▼
        التحقق من X-Hub-Signature-256
                   │
                   ▼
        تحديد الـ WABA المعني
                   │
                   ▼
        تحديد المطوّر المالك
                   │
                   ▼
        تحديث حالة الرسالة في DB
                   │
                   ▼
        إرسال الحدث لـ Developer Webhooks
```

---

## 9. WhatsApp Messaging API

### 9.1 صيغ الرسائل المدعومة

#### إرسال نص

```bash
curl -X POST https://api.rukny.io/v1/whatsapp/messages \
  -H "X-API-Key: rk_live_xxxxxxxxxxxx" \
  -H "Content-Type: application/json" \
  -d '{
    "from": "PHONE_NUMBER_ID",
    "to": "+9647xxxxxxxxx",
    "type": "text",
    "text": {
      "body": "مرحباً! هذه رسالة تجريبية من Rukny API",
      "preview_url": true
    }
  }'
```

#### إرسال صورة

```bash
curl -X POST https://api.rukny.io/v1/whatsapp/messages \
  -H "X-API-Key: rk_live_xxxxxxxxxxxx" \
  -d '{
    "from": "PHONE_NUMBER_ID",
    "to": "+9647xxxxxxxxx",
    "type": "image",
    "image": {
      "link": "https://example.com/image.jpg",
      "caption": "صورة المنتج"
    }
  }'
```

#### إرسال قالب

```bash
curl -X POST https://api.rukny.io/v1/whatsapp/messages \
  -H "X-API-Key: rk_live_xxxxxxxxxxxx" \
  -d '{
    "from": "PHONE_NUMBER_ID",
    "to": "+9647xxxxxxxxx",
    "type": "template",
    "template": {
      "name": "order_confirmation",
      "language": { "code": "ar" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "أحمد" },
            { "type": "text", "text": "#12345" }
          ]
        }
      ]
    }
  }'
```

#### إرسال رسالة تفاعلية (أزرار)

```bash
curl -X POST https://api.rukny.io/v1/whatsapp/messages \
  -H "X-API-Key: rk_live_xxxxxxxxxxxx" \
  -d '{
    "from": "PHONE_NUMBER_ID",
    "to": "+9647xxxxxxxxx",
    "type": "interactive",
    "interactive": {
      "type": "button",
      "body": { "text": "هل تريد تأكيد الطلب؟" },
      "action": {
        "buttons": [
          { "type": "reply", "reply": { "id": "confirm", "title": "تأكيد ✅" } },
          { "type": "reply", "reply": { "id": "cancel", "title": "إلغاء ❌" } }
        ]
      }
    }
  }'
```

### 9.2 استجابة الإرسال

```json
{
  "id": "msg_xxxxxxxxxxxxxxxx",
  "status": "accepted",
  "from": "PHONE_NUMBER_ID",
  "to": "+9647xxxxxxxxx",
  "type": "text",
  "timestamp": "2026-04-11T10:30:00.000Z",
  "meta_message_id": "wamid.xxxx"
}
```

### 9.3 حالات الرسالة

```
accepted → queued → sent → delivered → read
                      ↓
                    failed
```

---

## 10. نظام Templates

### 10.1 API لإنشاء قالب

```bash
curl -X POST https://api.rukny.io/v1/whatsapp/templates \
  -H "X-API-Key: rk_live_xxxxxxxxxxxx" \
  -d '{
    "name": "order_confirmation",
    "language": "ar",
    "category": "UTILITY",
    "components": [
      {
        "type": "HEADER",
        "format": "TEXT",
        "text": "تأكيد الطلب"
      },
      {
        "type": "BODY",
        "text": "مرحباً {{1}}، تم تأكيد طلبك رقم {{2}} بنجاح."
      },
      {
        "type": "FOOTER",
        "text": "شكراً لتسوقك معنا"
      }
    ]
  }'
```

### 10.2 مزامنة القوالب مع Meta

```
كل 15 دقيقة → Cron Job → لكل WABA نشط:
  1. GET /v21.0/{waba_id}/message_templates
  2. مقارنة مع القوالب المحلية
  3. تحديث الحالة (APPROVED/REJECTED/PAUSED)
  4. إرسال webhook event "template.status_updated" للمطوّر
```

---

## 11. نظام Webhooks

### 11.1 الأحداث المدعومة

| الحدث | الوصف |
|-------|-------|
| `message.sent` | رسالة أُرسلت بنجاح |
| `message.delivered` | رسالة وصلت للمستلم |
| `message.read` | رسالة قُرئت |
| `message.failed` | فشل إرسال الرسالة |
| `message.received` | رسالة واردة من عميل |
| `template.approved` | قالب اعتُمد من Meta |
| `template.rejected` | قالب رُفض |
| `template.status_updated` | تغيّرت حالة القالب |
| `account.status_updated` | تغيّرت حالة WABA |
| `phone.quality_updated` | تغيّر تقييم جودة الرقم |

### 11.2 صيغة Webhook Payload

```json
{
  "id": "evt_xxxxxxxxxxxxxxxx",
  "event": "message.delivered",
  "timestamp": "2026-04-11T10:30:05.000Z",
  "data": {
    "message_id": "msg_xxxxxxxxxxxxxxxx",
    "meta_message_id": "wamid.xxxx",
    "from": "+9647xxxxxxxxx",
    "to": "+9641xxxxxxxxx",
    "status": "delivered",
    "timestamp": "2026-04-11T10:30:05.000Z"
  }
}
```

### 11.3 الأمان — توقيع HMAC

```
X-Rukny-Signature: sha256=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

signature = HMAC-SHA256(webhook_secret, request_body)
```

### 11.4 إعادة المحاولة

```
المحاولة 1 → فشل → انتظار 30 ثانية
المحاولة 2 → فشل → انتظار 5 دقائق
المحاولة 3 → فشل → انتظار 30 دقيقة
(حسب الخطة)

بعد 10 فشل متتالي → تعطيل Webhook تلقائياً + إشعار للمطوّر
```

---

## 12. نظام الحصص والفوترة

### 12.1 الخطط

| الميزة | Free | Starter ($29) | Growth ($99) | Enterprise |
|--------|------|---------------|--------------|------------|
| رسائل/شهر | 1,000 | 10,000 | 100,000 | بلا حد |
| أرقام هاتف | 1 | 2 | 5 | بلا حد |
| مفاتيح API | 1 | 5 | 10 | بلا حد |
| Webhooks | 2 | 5 | 10 | بلا حد |
| جهات اتصال | 500 | 5,000 | 50,000 | بلا حد |
| Rate Limit | 30/دقيقة | 60/دقيقة | 120/دقيقة | 300/دقيقة |
| حفظ السجلات | 7 أيام | 30 يوم | 90 يوم | 365 يوم |
| Queue Priority | عادي | عادي | أولوية | أولوية |
| دعم مخصص | ❌ | ❌ | ✅ | ✅ |

### 12.2 نموذج الفوترة

```
التكلفة الإجمالية = رسوم الاشتراك + رسوم Meta (Conversation-based)

رسوم Meta تُمرّر للمطوّر:
- Marketing: ~$0.01-0.08/محادثة (حسب البلد)
- Utility: ~$0.004-0.02/محادثة
- Authentication: ~$0.003-0.01/محادثة
- Service: مجاني (أول 1000/شهر)

هامش Rukny: +15-25% على رسوم Meta
```

### 12.3 آلية خصم الرصيد

```
1. المطوّر يشحن رصيداً ($10, $50, $100, $500)
2. عند كل رسالة:
   a. التحقق من الحصة الشهرية
   b. خصم من الحصة إن كان ضمن الخطة
   c. إن تجاوز الحصة → خصم من الرصيد (pay-as-you-go)
   d. إن لم يوجد رصيد → رفض الإرسال + إشعار
```

---

## 13. نظام السجلات والتحليلات

### 13.1 لوحة تحكم الاستخدام

```
┌─────────────────────────────────────────────────┐
│  استخدام هذا الشهر                               │
│                                                 │
│  رسائل: ████████████░░░░ 7,523 / 10,000         │
│  API:    ████░░░░░░░░░░░░ 23,456 / 100,000       │
│  أرقام: ██░░░░░░░░░░░░░░ 1 / 2                   │
│                                                 │
│  ┌─ الرسائل حسب اليوم ──────────────────────┐  │
│  │  ▃▅▇█▆▅▃▂▁▃▅▇█▆▅▃▂▃▅▇█▆▅▃▂▁▃▅          │  │
│  │  1  3  5  7  9  11  13  15  17  ...       │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌─ حسب الحالة ──────┐  ┌─ حسب النوع ────────┐ │
│  │  ✅ Delivered: 92% │  │  📝 Text: 45%      │ │
│  │  📤 Sent: 5%      │  │  📋 Template: 40%  │ │
│  │  ❌ Failed: 3%     │  │  🖼 Media: 15%     │ │
│  └────────────────────┘  └────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 13.2 سجل الرسائل

| العمود | الوصف |
|--------|-------|
| ID | معرّف الرسالة |
| الاتجاه | صادرة/واردة |
| الرقم | رقم المستلم/المرسل |
| النوع | نص/قالب/وسائط |
| الحالة | accepted/sent/delivered/read/failed |
| التكلفة | التكلفة التقديرية |
| الوقت | وقت الإرسال |

---

## 14. الأمان

### 14.1 تشفير Access Tokens

```
خوارزمية: AES-256-GCM
المفتاح: مشتق من ENCRYPTION_KEY عبر scrypt
IV: عشوائي لكل تشفير (16 بايت)
Auth Tag: 16 بايت (GCM)
التخزين: base64(iv:encrypted:tag)
```

### 14.2 API Key Security

```
- Hash: SHA-256 (لا يُخزّن المفتاح الأصلي أبداً)
- يُعرض مرة واحدة فقط عند الإنشاء
- Rate limiting per key
- IP allowlist (اختياري)
- Scope-based permissions
- تدوير تلقائي (اختياري)
```

### 14.3 Webhook Security

```
- HMAC-SHA256 لتوقيع كل payload
- Secret فريد لكل webhook
- تدوير Secret متاح
- TLS/HTTPS مطلوب لعنوان Webhook
- IP allowlist لأحداث Meta
```

### 14.4 Rate Limiting

```
مستويات متعددة:
1. Per API Key: حسب الخطة (30-300 req/min)
2. Per IP: 1000 req/min (حماية عامة)
3. Per User: إجمالي كل المفاتيح — 500 req/min
4. Meta API: 80 msg/sec per phone (يُدار بالطابور)
```

### 14.5 تحقق Meta Webhook

```typescript
// التحقق من توقيع X-Hub-Signature-256
function verifyMetaSignature(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature.replace('sha256=', '')),
    Buffer.from(expected),
  );
}
```

---

## 15. مراحل التنفيذ

### المرحلة 1 — الأساسيات (3-4 أسابيع)

**الهدف:** مطوّر يمكنه الربط وإرسال أول رسالة

| # | المهمة | الأولوية | التعقيد |
|---|--------|----------|---------|
| 1.1 | إنشاء نماذج Prisma الجديدة + Migration | 🔴 | متوسط |
| 1.2 | بناء نظام API Keys (إنشاء/إدارة/تحقق) | 🔴 | متوسط |
| 1.3 | بناء `ApiKeyAuthGuard` | 🔴 | متوسط |
| 1.4 | بناء `TokenEncryptionService` | 🔴 | منخفض |
| 1.5 | بناء `MetaApiService` (وسيط Graph API) | 🔴 | متوسط |
| 1.6 | بناء Embedded Signup flow كاملاً | 🔴 | عالي |
| 1.7 | بناء `POST /v1/whatsapp/messages` (إرسال) | 🔴 | متوسط |
| 1.8 | بناء webhook receiver من Meta | 🔴 | عالي |
| 1.9 | بناء Developer Subscription (خطة مجانية) | 🔴 | متوسط |
| 1.10 | تحديث Developers Portal (API Keys ديناميكي) | 🟡 | متوسط |
| 1.11 | بناء صفحة ربط WhatsApp في Portal | 🟡 | عالي |
| 1.12 | بناء صفحة إرسال رسالة تجريبية (ديناميكي) | 🟡 | منخفض |

**المخرجات:**
- ✅ المطوّر ينشئ حساب → ينشئ API Key → يربط رقم WhatsApp → يرسل رسالة

---

### المرحلة 2 — القدرات الكاملة (3-4 أسابيع)

**الهدف:** منصة مكتملة الميزات

| # | المهمة | الأولوية | التعقيد |
|---|--------|----------|---------|
| 2.1 | نظام Templates API (CRUD + مزامنة Meta) | 🟡 | عالي |
| 2.2 | نظام Contacts API | 🟡 | متوسط |
| 2.3 | نظام Developer Webhooks (تسجيل + توصيل) | 🟡 | عالي |
| 2.4 | BullMQ Queue للرسائل | 🟡 | عالي |
| 2.5 | نظام الحصص والفوترة الكامل | 🟡 | عالي |
| 2.6 | سجلات API + سجلات الرسائل | 🟡 | متوسط |
| 2.7 | لوحة تحكم Usage ديناميكية | 🟡 | متوسط |
| 2.8 | صفحة Templates ديناميكية + إنشاء قالب | 🟡 | متوسط |
| 2.9 | صفحة Contacts ديناميكية | 🟡 | منخفض |
| 2.10 | صفحة Webhooks ديناميكية | 🟡 | منخفض |
| 2.11 | صفحة Logs ديناميكية (رسائل + API) | 🟡 | متوسط |
| 2.12 | صفحة Billing ديناميكية + شحن رصيد | 🟡 | عالي |

**المخرجات:**
- ✅ إدارة كاملة للقوالب + جهات الاتصال + Webhooks
- ✅ حصص + فوترة + شحن رصيد
- ✅ سجلات مفصّلة + تحليلات

---

### المرحلة 3 — التوسع والتحسين (4-6 أسابيع)

**الهدف:** تجربة مطوّر احترافية

| # | المهمة | الأولوية | التعقيد |
|---|--------|----------|---------|
| 3.1 | توثيق API تفاعلي (مثل Swagger/Redoc) | 🟢 | متوسط |
| 3.2 | دليل البدء السريع التفاعلي | 🟢 | منخفض |
| 3.3 | Sandbox/Test Mode | 🟢 | عالي |
| 3.4 | SDKs (JavaScript + Python) | 🔵 | عالي |
| 3.5 | Campaign/Bulk Send API | 🟢 | عالي |
| 3.6 | Inbox (محادثات ثنائية الاتجاه) | 🔵 | عالي جداً |
| 3.7 | Chatbot Builder | 🔵 | عالي جداً |
| 3.8 | Admin Dashboard لمراقبة كل المطوّرين | 🟢 | متوسط |
| 3.9 | نظام التنبيهات (بريد/واتساب) عند تجاوز حصة | 🟢 | منخفض |
| 3.10 | WhatsApp Flows API | 🔵 | عالي |

---

## 16. هيكل ملفات المشروع النهائي

### API Backend (الإضافات)

```
apps/api/src/
├── domain/
│   ├── developer/                          ← 🆕 كامل
│   │   ├── developer.module.ts
│   │   ├── api-keys/
│   │   │   ├── api-keys.controller.ts
│   │   │   ├── api-keys.service.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-api-key.dto.ts
│   │   │   │   └── update-api-key.dto.ts
│   │   │   └── guards/
│   │   │       └── api-key-auth.guard.ts
│   │   ├── subscriptions/
│   │   │   ├── dev-subscriptions.controller.ts
│   │   │   ├── dev-subscriptions.service.ts
│   │   │   ├── dev-plan-limits.config.ts
│   │   │   └── dto/
│   │   │       └── upgrade-plan.dto.ts
│   │   ├── webhooks/
│   │   │   ├── dev-webhooks.controller.ts
│   │   │   ├── dev-webhooks.service.ts
│   │   │   ├── webhook-delivery.service.ts
│   │   │   └── dto/
│   │   │       ├── create-webhook.dto.ts
│   │   │       └── update-webhook.dto.ts
│   │   ├── contacts/
│   │   │   ├── contacts.controller.ts
│   │   │   ├── contacts.service.ts
│   │   │   └── dto/
│   │   │       ├── create-contact.dto.ts
│   │   │       └── update-contact.dto.ts
│   │   └── usage/
│   │       ├── usage.controller.ts
│   │       └── usage.service.ts
│   │
│   └── whatsapp-provider/                  ← 🆕 كامل
│       ├── whatsapp-provider.module.ts
│       ├── accounts/
│       │   ├── waba.controller.ts
│       │   ├── waba.service.ts
│       │   ├── embedded-signup.service.ts
│       │   └── dto/
│       │       └── connect-waba.dto.ts
│       ├── phone-numbers/
│       │   ├── phone-numbers.controller.ts
│       │   ├── phone-numbers.service.ts
│       │   └── dto/
│       │       └── register-phone.dto.ts
│       ├── messaging/
│       │   ├── messaging.controller.ts
│       │   ├── messaging.service.ts
│       │   ├── message-queue.service.ts
│       │   ├── message-processor.service.ts
│       │   └── dto/
│       │       ├── send-text.dto.ts
│       │       ├── send-template.dto.ts
│       │       ├── send-media.dto.ts
│       │       └── send-interactive.dto.ts
│       ├── templates/
│       │   ├── templates.controller.ts
│       │   ├── templates.service.ts
│       │   └── dto/
│       │       ├── create-template.dto.ts
│       │       └── update-template.dto.ts
│       ├── webhooks/
│       │   ├── meta-webhook.controller.ts
│       │   └── meta-webhook.service.ts
│       └── shared/
│           ├── meta-api.service.ts
│           ├── token-encryption.service.ts
│           └── quota.service.ts
```

### Developers Portal (الإضافات والتغييرات)

```
apps/developers/
├── app/
│   ├── (dashboard)/
│   │   └── dashboard/
│   │       ├── page.tsx                    ← ✏️ تحديث (بيانات حقيقية)
│   │       ├── api-keys/
│   │       │   └── page.tsx                ← ✏️ تحديث (ديناميكي)
│   │       ├── whatsapp/
│   │       │   ├── page.tsx                ← ✏️ تحديث (نظرة عامة + ربط)
│   │       │   ├── accounts/
│   │       │   │   └── page.tsx            ← 🆕 إدارة WABA والأرقام
│   │       │   ├── send/page.tsx           ← ✏️ تحديث (إرسال حقيقي)
│   │       │   ├── templates/
│   │       │   │   ├── page.tsx            ← ✏️ تحديث (ديناميكي)
│   │       │   │   └── create/
│   │       │   │       └── page.tsx        ← 🆕 إنشاء قالب
│   │       │   ├── contacts/page.tsx       ← ✏️ تحديث (ديناميكي)
│   │       │   ├── webhooks/page.tsx       ← ✏️ تحديث (ديناميكي)
│   │       │   └── logs/page.tsx           ← ✏️ تحديث (ديناميكي)
│   │       ├── usage/page.tsx              ← ✏️ تحديث (ديناميكي)
│   │       ├── billing/page.tsx            ← ✏️ تحديث (ديناميكي)
│   │       └── docs/
│   │           ├── page.tsx                ← ✏️ تحديث
│   │           ├── quick-start/page.tsx    ← 🆕
│   │           ├── api-reference/page.tsx  ← 🆕
│   │           └── webhooks/page.tsx       ← 🆕
│   └── api/
│       └── developer/
│           └── [...path]/
│               └── route.ts               ← 🆕 BFF Proxy
│
├── components/
│   ├── dashboard/
│   │   ├── sidebar.tsx                     ← ✏️ تحديث nav items
│   │   └── ...
│   └── whatsapp/                           ← 🆕 مكونات WhatsApp
│       ├── embedded-signup-button.tsx       ← زر ربط الحساب
│       ├── waba-status-card.tsx             ← بطاقة حالة WABA
│       ├── phone-number-card.tsx            ← بطاقة الرقم
│       ├── message-composer.tsx             ← مؤلف الرسائل
│       ├── template-builder.tsx             ← بناء القوالب
│       └── api-key-dialog.tsx              ← نافذة إنشاء API Key
│
└── lib/
    └── api/
        ├── auth.ts                         ← بدون تغيير
        ├── developer.ts                    ← 🆕 API client للمطوّر
        ├── whatsapp.ts                     ← 🆕 API client للواتساب
        └── types.ts                        ← 🆕 أنواع TypeScript
```

### Prisma Schema (الإضافات)

```
apps/api/prisma/
├── schema.prisma                           ← ✏️ إضافة 10 نماذج + enums جديدة
└── migrations/
    └── 20260411_whatsapp_provider/         ← 🆕 migration
        └── migration.sql
```

---

## ملاحظات ختامية

### التوافق مع البنية الحالية

- **لا تعارض** مع نظام WhatsApp الحالي (OTP + إشعارات المتاجر) — ذاك يبقى يعمل برقم المنصة
- **DeveloperSubscription** منفصل تماماً عن **Subscription** (اشتراك المستخدم العادي)
- **API Key Guard** يعمل بجانب **JWT Guard** — كل واحد لمجوعة endpoints مختلفة
- الـ BFF Proxy الجديد (`/api/developer/`) مستقل عن proxy المصادقة (`/api/auth/`)

### المتطلبات من Meta

1. **Tech Provider Approval** — موافقة Meta عليك كمزوّد تقنية ✅ (مذكور في الطلب)
2. **Embedded Signup Configuration** — إعداد في Meta Business Settings
3. **Webhook Subscription** — تسجيل URL واحد لاستقبال كل الأحداث
4. **App Review** — مراجعة التطبيق لصلاحيات `whatsapp_business_management` و `whatsapp_business_messaging`

### التكلفة التشغيلية المتوقعة

```
البنية التحتية:
- Redis (مطلوب للقوائم والتخزين المؤقت): ~$15/شهر
- PostgreSQL (إضافي للنماذج الجديدة): ~$10/شهر إضافي
- BullMQ Worker: يعمل على نفس السيرفر

Meta:
- رسوم المحادثات تُحمّل على المطوّر (+ هامش 15-25%)
- أول 1000 محادثة خدمة/شهر مجانية لكل رقم
```

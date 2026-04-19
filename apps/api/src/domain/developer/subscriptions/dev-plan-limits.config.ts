/**
 * 📦 حدود خطط المطوّرين
 * كل خطة لها حدود محددة للموارد
 */

export interface DeveloperPlanLimits {
  maxApps: number;
  maxApiKeys: number;
  maxPhoneNumbers: number;
  maxWebhooks: number;
  maxContacts: number;
  maxMessagesPerMonth: number;
  rateLimitPerMinute: number;
  logRetentionDays: number;
  queuePriority: 'normal' | 'high';
  dedicatedSupport: boolean;
  templateSync: boolean;
  customBranding: boolean;
}

export const DEVELOPER_PLAN_LIMITS: Record<string, DeveloperPlanLimits> = {
  FREE: {
    maxApps: 3,
    maxApiKeys: 1,
    maxPhoneNumbers: 1,
    maxWebhooks: 2,
    maxContacts: 500,
    maxMessagesPerMonth: 1000,
    rateLimitPerMinute: 30,
    logRetentionDays: 7,
    queuePriority: 'normal',
    dedicatedSupport: false,
    templateSync: false,
    customBranding: false,
  },
  STARTER: {
    maxApps: 5,
    maxApiKeys: 5,
    maxPhoneNumbers: 2,
    maxWebhooks: 5,
    maxContacts: 5000,
    maxMessagesPerMonth: 10000,
    rateLimitPerMinute: 60,
    logRetentionDays: 30,
    queuePriority: 'normal',
    dedicatedSupport: false,
    templateSync: true,
    customBranding: false,
  },
  GROWTH: {
    maxApps: 15,
    maxApiKeys: 10,
    maxPhoneNumbers: 5,
    maxWebhooks: 10,
    maxContacts: 50000,
    maxMessagesPerMonth: 100000,
    rateLimitPerMinute: 120,
    logRetentionDays: 90,
    queuePriority: 'high',
    dedicatedSupport: true,
    templateSync: true,
    customBranding: true,
  },
  ENTERPRISE: {
    maxApps: 100,
    maxApiKeys: 100,
    maxPhoneNumbers: 50,
    maxWebhooks: 50,
    maxContacts: 1000000,
    maxMessagesPerMonth: -1, // unlimited
    rateLimitPerMinute: 300,
    logRetentionDays: 365,
    queuePriority: 'high',
    dedicatedSupport: true,
    templateSync: true,
    customBranding: true,
  },
};

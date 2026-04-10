import { SetMetadata } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { PlanLimits } from '../../../../domain/subscriptions/plan-limits.config';

/**
 * 🔒 فحص الباقة المطلوبة للوصول
 *
 * الاستخدام:
 * @RequirePlan('PRO')          — يحتاج باقة PRO أو أعلى
 * @RequirePlan('WHALE')        — يحتاج باقة WHALE أو أعلى
 */
export const REQUIRE_PLAN_KEY = 'require_plan';
export const RequirePlan = (minPlan: SubscriptionPlan) =>
  SetMetadata(REQUIRE_PLAN_KEY, minPlan);

/**
 * 🔢 فحص حد عددي قبل إنشاء مورد
 *
 * الاستخدام:
 * @CheckLimit('forms')             — يتحقق من عدد النماذج
 * @CheckLimit('products')          — يتحقق من عدد المنتجات
 * @CheckLimit('imagesPerProduct')  — يتحقق من صور المنتج
 */
export const CHECK_LIMIT_KEY = 'check_limit';
export const CheckLimit = (limitKey: keyof PlanLimits) =>
  SetMetadata(CHECK_LIMIT_KEY, limitKey);

/**
 * ✅ فحص ميزة (boolean أو مستوى)
 *
 * الاستخدام:
 * @CheckFeature('multiStepForms')   — هل النماذج متعددة الخطوات مفعلة؟
 * @CheckFeature('digitalProducts')  — هل المنتجات الرقمية مفعلة؟
 * @CheckFeature('googleSheets')     — هل تكامل Google Sheets مفعل؟
 */
export const CHECK_FEATURE_KEY = 'check_feature';
export const CheckFeature = (featureKey: keyof PlanLimits) =>
  SetMetadata(CHECK_FEATURE_KEY, featureKey);

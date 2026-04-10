import { IsEnum, IsOptional } from 'class-validator';
import { BillingCycle, SubscriptionPlan } from '@prisma/client';

export class UpgradePlanDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsEnum(BillingCycle)
  billingCycle: BillingCycle;
}

export class AdminSetPlanDto {
  @IsEnum(SubscriptionPlan)
  plan: SubscriptionPlan;

  @IsOptional()
  @IsEnum(BillingCycle)
  billingCycle?: BillingCycle;
}

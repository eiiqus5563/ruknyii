import { IsIn, IsOptional, IsString } from 'class-validator';

export class UpgradePlanDto {
  @IsString()
  @IsIn(['STARTER', 'GROWTH', 'ENTERPRISE'])
  plan: string;

  @IsOptional()
  @IsIn(['MONTHLY', 'YEARLY'])
  billingCycle?: string;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}

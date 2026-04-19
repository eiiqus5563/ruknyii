import { IsInt, IsOptional, IsString, Min, IsIn } from 'class-validator';

export class TopUpWalletDto {
  @IsInt()
  @Min(1000) // حد أدنى 1000 دينار عراقي
  amount: number;

  @IsString()
  @IsIn(['zaincash', 'fastpay', 'card'])
  paymentMethod: string;
}

export class UpdateAutoRechargeDto {
  @IsOptional()
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(5000)
  amount?: number;

  @IsOptional()
  @IsInt()
  @Min(1000)
  threshold?: number;
}

export class UpdateLowBalanceAlertDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  threshold?: number;
}

export class AllocateAppBalanceDto {
  @IsInt()
  @Min(1)
  amount: number;
}

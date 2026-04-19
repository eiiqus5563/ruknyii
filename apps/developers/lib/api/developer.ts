import api from '../api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface DeveloperSubscription {
  plan: 'FREE' | 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  messagesUsed: number;
  messagesLimit: number;
  apiKeysUsed: number;
  apiKeysLimit: number;
  phoneNumbersUsed: number;
  phoneNumbersLimit: number;
  webhooksUsed: number;
  webhooksLimit: number;
  contactsUsed: number;
  contactsLimit: number;
  rateLimitPerMinute: number;
  logRetentionDays: number;
}

export interface DeveloperWallet {
  balance: number;
  autoRechargeEnabled: boolean;
  lowBalanceAlert: number | null;
  totalTopUps: number;
  totalSpent: number;
}

export interface DeveloperAppWallet {
  id: string;
  appId: string;
  appName: string;
  balance: number;
  currency: string;
  totalAllocated: number;
  totalSpent: number;
  createdAt: string;
  updatedAt: string;
}

export interface UsageSummary {
  subscription: DeveloperSubscription;
  wallet: DeveloperWallet;
  masterWallet: DeveloperWallet;
  appWallet: DeveloperAppWallet | null;
  whatsappAccountsCount: number;
}

export interface DailyUsage {
  date: string;
  messagesCount: number;
  apiRequestsCount: number;
}

/* ------------------------------------------------------------------ */
/*  API calls                                                          */
/* ------------------------------------------------------------------ */

export async function getSubscription(): Promise<DeveloperSubscription> {
  const { data } = await api.get<DeveloperSubscription>('/developer/subscription');
  return data;
}

export async function getWallet(): Promise<DeveloperWallet> {
  const { data } = await api.get<DeveloperWallet>('/developer/wallet');
  return data;
}

export async function getAppWallet(appId: string): Promise<DeveloperAppWallet> {
  const { data } = await api.get<DeveloperAppWallet>(`/developer/wallet/apps/${encodeURIComponent(appId)}`);
  return data;
}

export async function allocateAppWallet(appId: string, amount: number): Promise<{ success: boolean; amount: number; masterBalance: number; appBalance: number }> {
  const { data } = await api.post<{ success: boolean; amount: number; masterBalance: number; appBalance: number }>(
    `/developer/wallet/apps/${encodeURIComponent(appId)}/allocate`,
    { amount },
  );
  return data;
}

export async function getUsageSummary(appId?: string): Promise<UsageSummary> {
  const [sub, wallet, appWallet, whatsappAccounts] = await Promise.all([
    api.get<DeveloperSubscription>('/developer/subscription').catch(() => null),
    api.get<DeveloperWallet>('/developer/wallet').catch(() => null),
    appId ? api.get<DeveloperAppWallet>(`/developer/wallet/apps/${encodeURIComponent(appId)}`).catch(() => null) : Promise.resolve(null),
    appId ? api.get<any[]>('/developer/whatsapp/accounts', { appId }).catch(() => null) : Promise.resolve(null),
  ]);

  const defaultSub: DeveloperSubscription = {
    plan: 'FREE',
    messagesUsed: 0,
    messagesLimit: 1000,
    apiKeysUsed: 0,
    apiKeysLimit: 1,
    phoneNumbersUsed: 0,
    phoneNumbersLimit: 1,
    webhooksUsed: 0,
    webhooksLimit: 2,
    contactsUsed: 0,
    contactsLimit: 500,
    rateLimitPerMinute: 30,
    logRetentionDays: 7,
  };

  const defaultWallet: DeveloperWallet = {
    balance: 0,
    autoRechargeEnabled: false,
    lowBalanceAlert: null,
    totalTopUps: 0,
    totalSpent: 0,
  };

  return {
    subscription: sub?.data ?? defaultSub,
    wallet: appWallet?.data
      ? {
          balance: appWallet.data.balance,
          autoRechargeEnabled: false,
          lowBalanceAlert: null,
          totalTopUps: appWallet.data.totalAllocated,
          totalSpent: appWallet.data.totalSpent,
        }
      : wallet?.data ?? defaultWallet,
    masterWallet: wallet?.data ?? defaultWallet,
    appWallet: appWallet?.data ?? null,
    whatsappAccountsCount: Array.isArray(whatsappAccounts?.data) ? whatsappAccounts.data.length : 0,
  };
}

export async function getDailyUsage(days = 30): Promise<DailyUsage[]> {
  const { data } = await api.get<DailyUsage[]>('/developer/usage/daily', { days });
  return Array.isArray(data) ? data : [];
}

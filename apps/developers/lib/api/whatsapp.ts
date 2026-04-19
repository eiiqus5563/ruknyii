import api from '../api-client';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export type WabaStatus = 'PENDING_SETUP' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR' | 'BANNED';

export interface WabaAccount {
  id: string;
  wabaId: string;
  businessName: string;
  businessId: string;
  currency: string;
  timezone: string;
  status: WabaStatus;
  webhookSubscribed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmbeddedSignupConfig {
  appId: string;
  configId: string;
}

function withAppId(endpoint: string, appId: string) {
  const separator = endpoint.includes('?') ? '&' : '?';
  return `${endpoint}${separator}appId=${encodeURIComponent(appId)}`;
}

export type PhoneQuality = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN';
export type PhoneMessagingLimit = 'TIER_1K' | 'TIER_10K' | 'TIER_100K' | 'UNLIMITED';
export type PhoneStatus = 'PENDING' | 'VERIFIED' | 'ACTIVE' | 'DISABLED' | 'BANNED';

export interface PhoneNumber {
  id: string;
  phoneNumberId: string;
  phoneNumber: string;
  displayPhoneNumber: string;
  verifiedName: string;
  qualityRating: PhoneQuality;
  messagingLimit: PhoneMessagingLimit;
  status: PhoneStatus;
  codeVerificationStatus: string | null;
  nameStatus: string | null;
  profilePictureUrl: string | null;
  aboutText: string | null;
  address: string | null;
  description: string | null;
  email: string | null;
  websites: string[] | null;
  category: string | null;
  isOfficialBusinessAccount: boolean;
  createdAt: string;
  updatedAt: string;
  account?: { id: string; businessName: string; wabaId: string };
}

export type TemplateCategory = 'AUTHENTICATION' | 'MARKETING' | 'UTILITY';
export type TemplateStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAUSED' | 'DISABLED';

export interface WhatsappTemplate {
  id: string;
  name: string;
  language: string;
  category: TemplateCategory;
  status: TemplateStatus;
  components: any[];
  metaTemplateId: string | null;
  rejectedReason: string | null;
  qualityScore: string | null;
  accountId: string;
  account?: { id: string; businessName: string; wabaId: string };
  createdAt: string;
  updatedAt: string;
}

/* ------------------------------------------------------------------ */
/*  WABA Accounts                                                      */
/* ------------------------------------------------------------------ */

export async function getEmbeddedSignupConfig(): Promise<EmbeddedSignupConfig> {
  const { data } = await api.get<EmbeddedSignupConfig>('/developer/whatsapp/embedded-signup-config');
  return data;
}

export async function connectWaba(appId: string, code: string, wabaId?: string): Promise<WabaAccount> {
  const { data } = await api.post<WabaAccount>('/developer/whatsapp/connect', { appId, code, wabaId });
  return data;
}

export async function getWabaAccounts(appId: string): Promise<WabaAccount[]> {
  const { data } = await api.get<WabaAccount[]>('/developer/whatsapp/accounts', { appId });
  return data;
}

export async function disconnectWaba(appId: string, id: string): Promise<void> {
  await api.delete(withAppId(`/developer/whatsapp/accounts/${encodeURIComponent(id)}`, appId));
}

export async function refreshWaba(appId: string, id: string): Promise<WabaAccount> {
  const { data } = await api.post<WabaAccount>(withAppId(`/developer/whatsapp/accounts/${encodeURIComponent(id)}/refresh`, appId));
  return data;
}

/* ------------------------------------------------------------------ */
/*  Phone Numbers                                                      */
/* ------------------------------------------------------------------ */

export async function getPhoneNumbers(appId: string): Promise<PhoneNumber[]> {
  const { data } = await api.get<PhoneNumber[]>('/developer/whatsapp/phone-numbers', { appId });
  return data;
}

export async function getPhoneNumber(appId: string, id: string): Promise<PhoneNumber> {
  const { data } = await api.get<PhoneNumber>(`/developer/whatsapp/phone-numbers/${encodeURIComponent(id)}`, { appId });
  return data;
}

export async function registerPhoneNumber(appId: string, id: string, pin: string): Promise<void> {
  await api.post(withAppId(`/developer/whatsapp/phone-numbers/${encodeURIComponent(id)}/register`, appId), { pin });
}

export async function updatePhoneProfile(
  appId: string,
  id: string,
  profile: { about?: string; address?: string; description?: string; email?: string; websites?: string[]; profilePictureUrl?: string },
): Promise<PhoneNumber> {
  const { data } = await api.patch<PhoneNumber>(withAppId(`/developer/whatsapp/phone-numbers/${encodeURIComponent(id)}/profile`, appId), profile);
  return data;
}

export async function sendTestMessage(appId: string, id: string, to: string): Promise<void> {
  await api.post(withAppId(`/developer/whatsapp/phone-numbers/${encodeURIComponent(id)}/send-test`, appId), { to });
}

/* ------------------------------------------------------------------ */
/*  Templates                                                          */
/* ------------------------------------------------------------------ */

export async function getTemplates(appId: string, accountId?: string): Promise<WhatsappTemplate[]> {
  let url = withAppId('/developer/whatsapp/templates', appId);
  if (accountId) url += `&accountId=${encodeURIComponent(accountId)}`;
  const { data } = await api.get<WhatsappTemplate[]>(url);
  return data;
}

export async function createTemplate(input: {
  appId: string;
  name: string;
  language: string;
  category: TemplateCategory;
  components: any[];
  accountId?: string;
}): Promise<WhatsappTemplate> {
  const { data } = await api.post<WhatsappTemplate>(withAppId('/developer/whatsapp/templates', input.appId), {
    name: input.name,
    language: input.language,
    category: input.category,
    components: input.components,
    accountId: input.accountId,
  });
  return data;
}

export async function deleteTemplate(appId: string, name: string): Promise<void> {
  await api.delete(withAppId(`/developer/whatsapp/templates/${encodeURIComponent(name)}`, appId));
}

export async function syncTemplates(appId: string, accountId?: string): Promise<void> {
  let url = withAppId('/developer/whatsapp/templates/sync', appId);
  if (accountId) url += `&accountId=${encodeURIComponent(accountId)}`;
  await api.post(url);
}

import api from '../api-client';

export type AppStatus = 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type AppType = 'BUSINESS' | 'CONSUMER';

export interface DeveloperApp {
  id: string;
  appId: string;
  name: string;
  contactEmail: string | null;
  appType: AppType;
  description: string | null;
  businessId: string | null;
  icon: string | null;
  status: AppStatus;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppInput {
  name: string;
  contactEmail: string;
  appType: AppType;
  otpCode: string;
  description?: string;
  businessId?: string;
  icon?: string;
}

export interface UpdateAppInput {
  name?: string;
  description?: string;
  businessId?: string;
  icon?: string;
}

export async function getApps(): Promise<DeveloperApp[]> {
  const { data } = await api.get<DeveloperApp[]>('/developer/apps');
  return Array.isArray(data) ? data : [];
}

export async function getApp(appId: string): Promise<DeveloperApp> {
  const { data } = await api.get<DeveloperApp>(`/developer/apps/${appId}`);
  return data;
}

export async function createApp(input: CreateAppInput): Promise<DeveloperApp> {
  const { data } = await api.post<DeveloperApp>('/developer/apps', input);
  return data;
}

export async function updateApp(appId: string, input: UpdateAppInput): Promise<DeveloperApp> {
  const { data } = await api.patch<DeveloperApp>(`/developer/apps/${appId}`, input);
  return data;
}

export async function deleteApp(appId: string): Promise<void> {
  await api.delete(`/developer/apps/${appId}`);
}

/* ────────── OTP ────────── */

export async function sendAppOtp(phoneNumber: string): Promise<{ sent: boolean; expiresInSeconds: number }> {
  const { data } = await api.post<{ sent: boolean; expiresInSeconds: number }>(
    '/developer/apps/otp/send',
    { phoneNumber },
  );
  return data;
}

export async function verifyAppOtp(phoneNumber: string, code: string): Promise<{ verified: boolean }> {
  const { data } = await api.post<{ verified: boolean }>(
    '/developer/apps/otp/verify',
    { phoneNumber, code },
  );
  return data;
}

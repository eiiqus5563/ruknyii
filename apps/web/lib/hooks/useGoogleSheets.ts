'use client';

import { useState, useCallback } from 'react';
import { AuthClient } from '@/lib/auth/auth-client';
import { API_URL } from '@/lib/config';

export enum GoogleSheetsStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  SYNCING = 'SYNCING',
  ERROR = 'ERROR',
}

export interface GoogleSheetsConfig {
  spreadsheetId?: string;
  spreadsheetUrl?: string;
  sheetName?: string;
  isAutoSync: boolean;
  lastSyncAt?: string;
  syncedCount?: number;
}

export interface IntegrationStatus {
  connected: boolean;
  spreadsheetUrl?: string;
  lastSyncAt?: string;
  syncedCount?: number;
  isAutoSync?: boolean;
}

export function useGoogleSheets() {
  const [status, setStatus] = useState<GoogleSheetsStatus>(GoogleSheetsStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<GoogleSheetsConfig | null>(null);

  const getAuthHeaders = useCallback(async () => {
    let token = AuthClient.getToken();
    if (!token) {
      const refreshed = await AuthClient.refreshTokens();
      if (refreshed) token = AuthClient.getToken();
    }
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }, []);

  const getStatus = useCallback(async (formId: string): Promise<IntegrationStatus | null> => {
    try {
      const response = await fetch(`${API_URL}/integrations/google-sheets/status/${formId}`, {
        headers: await getAuthHeaders(),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (data.connected) {
        setStatus(GoogleSheetsStatus.CONNECTED);
        setConfig({
          spreadsheetUrl: data.spreadsheetUrl,
          isAutoSync: data.isAutoSync ?? false,
          lastSyncAt: data.lastSyncAt,
          syncedCount: data.syncedCount,
        });
      } else {
        setStatus(GoogleSheetsStatus.IDLE);
        setConfig(null);
      }
      return data;
    } catch {
      return null;
    }
  }, [getAuthHeaders]);

  const connect = useCallback(async (formId: string): Promise<{ authUrl?: string } | null> => {
    try {
      setStatus(GoogleSheetsStatus.CONNECTING);
      setError(null);
      const response = await fetch(`${API_URL}/integrations/google-sheets/connect/${formId}`, {
        headers: await getAuthHeaders(),
      });
      if (!response.ok) throw new Error('فشل في الاتصال');
      const data = await response.json();
      return data;
    } catch (err: any) {
      setStatus(GoogleSheetsStatus.ERROR);
      setError(err.message || 'فشل في الاتصال بـ Google Sheets');
      return null;
    }
  }, [getAuthHeaders]);

  const disconnect = useCallback(async (formId: string) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/integrations/google-sheets/disconnect/${formId}`, {
        method: 'DELETE',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) throw new Error('فشل في قطع الاتصال');
      setStatus(GoogleSheetsStatus.IDLE);
      setConfig(null);
    } catch (err: any) {
      setError(err.message || 'فشل في قطع الاتصال');
    }
  }, [getAuthHeaders]);

  const sync = useCallback(async (formId: string) => {
    try {
      setStatus(GoogleSheetsStatus.SYNCING);
      setError(null);
      const response = await fetch(`${API_URL}/integrations/google-sheets/export/${formId}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) throw new Error('فشل في المزامنة');
      const data = await response.json();
      setStatus(GoogleSheetsStatus.CONNECTED);
      setConfig(prev => prev ? { ...prev, lastSyncAt: new Date().toISOString(), syncedCount: data.syncedCount ?? prev.syncedCount } : prev);
      return data;
    } catch (err: any) {
      setStatus(GoogleSheetsStatus.ERROR);
      setError(err.message || 'فشل في مزامنة البيانات');
    }
  }, [getAuthHeaders]);

  const toggleAutoSync = useCallback(async (formId: string, enabled: boolean) => {
    try {
      setError(null);
      const response = await fetch(`${API_URL}/integrations/google-sheets/auto-sync/${formId}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
        body: JSON.stringify({ enabled }),
      });
      if (!response.ok) throw new Error('فشل في تحديث الإعداد');
      setConfig(prev => prev ? { ...prev, isAutoSync: enabled } : prev);
    } catch (err: any) {
      setError(err.message || 'فشل في تحديث المزامنة التلقائية');
    }
  }, [getAuthHeaders]);

  const reconnect = useCallback(async (formId: string): Promise<{ authUrl?: string } | null> => {
    try {
      setStatus(GoogleSheetsStatus.CONNECTING);
      setError(null);
      const response = await fetch(`${API_URL}/integrations/google-sheets/reconnect/${formId}`, {
        headers: await getAuthHeaders(),
      });
      if (!response.ok) throw new Error('فشل في إعادة الاتصال');
      const data = await response.json();
      return data;
    } catch (err: any) {
      setStatus(GoogleSheetsStatus.ERROR);
      setError(err.message || 'فشل في إعادة الاتصال');
      return null;
    }
  }, [getAuthHeaders]);

  const createSpreadsheet = useCallback(async (formId: string) => {
    try {
      setStatus(GoogleSheetsStatus.SYNCING);
      setError(null);
      const response = await fetch(`${API_URL}/integrations/google-sheets/create-spreadsheet/${formId}`, {
        method: 'POST',
        headers: await getAuthHeaders(),
      });
      if (!response.ok) throw new Error('فشل في إنشاء الشيت');
      const data = await response.json();
      setStatus(GoogleSheetsStatus.CONNECTED);
      setConfig(prev => prev ? {
        ...prev,
        spreadsheetUrl: data.spreadsheetUrl,
        spreadsheetId: data.spreadsheetId,
        syncedCount: data.syncedCount ?? prev.syncedCount,
      } : {
        spreadsheetUrl: data.spreadsheetUrl,
        spreadsheetId: data.spreadsheetId,
        isAutoSync: false,
        syncedCount: data.syncedCount ?? 0,
      });
      return data;
    } catch (err: any) {
      setStatus(GoogleSheetsStatus.ERROR);
      setError(err.message || 'فشل في إنشاء الشيت');
      return null;
    }
  }, [getAuthHeaders]);

  return {
    status,
    isConnected: status === GoogleSheetsStatus.CONNECTED,
    isSyncing: status === GoogleSheetsStatus.SYNCING,
    error,
    config,
    getStatus,
    connect,
    disconnect,
    sync,
    toggleAutoSync,
    reconnect,
    createSpreadsheet,
  };
}

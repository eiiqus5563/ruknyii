/**
 * LinkedIn Integration API
 */

import api from './client';
import { API_EXTERNAL_URL } from '@/lib/config';

// ============ Types ============

export interface LinkedInConnection {
  linkedinSub: string;
  name: string;
  email: string | null;
  profilePicUrl: string | null;
  profileUrl: string | null;
  tokenExpiry: string | null;
  createdAt: string;
}

export interface LinkedInBlock {
  id: string;
  userId: string;
  type: 'PROFILE_CARD';
  postUrl: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

// ============ API Functions ============

/** Get LinkedIn connection status */
export async function getLinkedInStatus(): Promise<{
  connected: boolean;
  connection: LinkedInConnection | null;
}> {
  const res = await api.get<{ connected: boolean; connection: LinkedInConnection | null }>(
    '/integrations/linkedin/status',
  );
  return res.data;
}

/** Get LinkedIn auth URL (redirects to OAuth) */
export function getLinkedInAuthUrl(): string {
  return `${API_EXTERNAL_URL}/integrations/linkedin/auth`;
}

/** Disconnect LinkedIn */
export async function disconnectLinkedIn(): Promise<void> {
  await api.delete('/integrations/linkedin');
}

/** Create a LinkedIn block */
export async function createLinkedInBlock(
  type: 'PROFILE_CARD',
): Promise<LinkedInBlock> {
  const res = await api.post<LinkedInBlock>('/integrations/linkedin/blocks', { type });
  return res.data;
}

/** Get user's LinkedIn blocks */
export async function getLinkedInBlocks(): Promise<LinkedInBlock[]> {
  const res = await api.get<LinkedInBlock[]>('/integrations/linkedin/blocks');
  return res.data;
}

/** Get public LinkedIn data for a user */
export async function getPublicLinkedInData(userId: string): Promise<{
  profile: Pick<LinkedInConnection, 'name' | 'email' | 'profilePicUrl' | 'profileUrl'> | null;
  blocks: LinkedInBlock[];
}> {
  const res = await api.get<{
    profile: Pick<LinkedInConnection, 'name' | 'email' | 'profilePicUrl' | 'profileUrl'> | null;
    blocks: LinkedInBlock[];
  }>(`/integrations/linkedin/blocks/public/${userId}`);
  return res.data;
}

/** Toggle a LinkedIn block's active status */
export async function toggleLinkedInBlock(blockId: string): Promise<LinkedInBlock> {
  const res = await api.patch<LinkedInBlock>(`/integrations/linkedin/blocks/${blockId}/toggle`);
  return res.data;
}

/** Delete a LinkedIn block */
export async function deleteLinkedInBlock(blockId: string): Promise<void> {
  await api.delete(`/integrations/linkedin/blocks/${blockId}`);
}

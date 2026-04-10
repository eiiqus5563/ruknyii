/**
 * YouTube Integration API
 */

import api from './client';
import { API_EXTERNAL_URL } from '@/lib/config';

// ============ Types ============

export interface YouTubeConnection {
  channelId: string;
  channelTitle: string;
  channelThumbnail: string | null;
  subscriberCount: number | null;
  tokenExpiry: string | null;
  createdAt: string;
}

export interface YouTubeVideo {
  id: string;
  title: string;
  description?: string;
  thumbnail: string;
  publishedAt: string;
  viewCount?: string;
  likeCount?: string;
  duration?: string;
  channelTitle?: string;
  url: string;
}

export interface YouTubeBlock {
  id: string;
  userId: string;
  type: 'LATEST_VIDEOS' | 'SINGLE_VIDEO';
  videoUrl: string | null;
  videoId: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
}

// ============ API Functions ============

/** Get YouTube connection status */
export async function getYouTubeStatus(): Promise<{
  connected: boolean;
  connection: YouTubeConnection | null;
}> {
  const res = await api.get<{ connected: boolean; connection: YouTubeConnection | null }>(
    '/integrations/youtube/status',
  );
  return res.data;
}

/** Get YouTube auth URL (redirects to OAuth) */
export function getYouTubeAuthUrl(): string {
  return `${API_EXTERNAL_URL}/integrations/youtube/auth`;
}

/** Fetch latest videos from connected channel */
export async function getYouTubeVideos(limit = 12): Promise<{ items: YouTubeVideo[] }> {
  const res = await api.get<{ items: YouTubeVideo[] }>(
    '/integrations/youtube/videos',
    { limit },
  );
  return res.data;
}

/** Get video info by URL */
export async function getYouTubeVideoInfo(url: string): Promise<YouTubeVideo> {
  const res = await api.get<YouTubeVideo>(
    '/integrations/youtube/video-info',
    { url },
  );
  return res.data;
}

/** Disconnect YouTube */
export async function disconnectYouTube(): Promise<void> {
  await api.delete('/integrations/youtube');
}

/** Create a YouTube block */
export async function createYouTubeBlock(
  type: 'LATEST_VIDEOS' | 'SINGLE_VIDEO',
  videoUrl?: string,
): Promise<YouTubeBlock> {
  const res = await api.post<YouTubeBlock>('/integrations/youtube/blocks', { type, videoUrl });
  return res.data;
}

/** Get user's YouTube blocks */
export async function getYouTubeBlocks(): Promise<YouTubeBlock[]> {
  const res = await api.get<YouTubeBlock[]>('/integrations/youtube/blocks');
  return res.data;
}

/** Get public YouTube blocks + videos for a user */
export async function getPublicYouTubeData(userId: string): Promise<{
  blocks: YouTubeBlock[];
  videos: { items: YouTubeVideo[] } | null;
}> {
  const res = await api.get<{
    blocks: YouTubeBlock[];
    videos: { items: YouTubeVideo[] } | null;
  }>(`/integrations/youtube/blocks/public/${userId}`);
  return res.data;
}

/** Toggle block active state */
export async function toggleYouTubeBlock(blockId: string): Promise<YouTubeBlock> {
  const res = await api.patch<YouTubeBlock>(
    `/integrations/youtube/blocks/${blockId}/toggle`,
  );
  return res.data;
}

/** Delete a block */
export async function deleteYouTubeBlock(blockId: string): Promise<void> {
  await api.delete(`/integrations/youtube/blocks/${blockId}`);
}

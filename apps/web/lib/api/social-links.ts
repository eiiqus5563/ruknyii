/**
 * 🔗 Social Links API - Create, read, update, delete social links
 */

import { z } from 'zod';
import api from './client';

// ============ Schemas ============

export const CreateSocialLinkSchema = z.object({
  platform: z.string().min(1, 'Platform is required'),
  username: z.string().optional(),
  url: z.string().url('Invalid URL'),
  title: z.string().optional(),
  thumbnail: z.string().optional(),
  layout: z.enum(['classic', 'featured']).optional(),
  displayOrder: z.number().optional(),
  groupId: z.string().optional(),
  status: z.enum(['active', 'hidden']).optional().default('active'),
  isPinned: z.boolean().optional(),
});

export type CreateSocialLinkInput = z.input<typeof CreateSocialLinkSchema>;

export const SocialLinkSchema = z.object({
  id: z.string(),
  platform: z.string(),
  username: z.string().nullable(),
  url: z.string(),
  title: z.string().nullable(),
  thumbnail: z.string().nullable().optional(),
  layout: z.enum(['classic', 'featured']).optional().default('classic'),
  displayOrder: z.number(),
  status: z.string(),
  totalClicks: z.number(),
  isPinned: z.boolean().optional().default(false),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type SocialLink = z.infer<typeof SocialLinkSchema>;

// ============ API Functions ============

/**
 * Create a new social link
 */
export async function createSocialLink(
  input: CreateSocialLinkInput,
): Promise<SocialLink> {
  const validated = CreateSocialLinkSchema.parse(input);
  const payload = {
    ...validated,
    username: (validated.username ?? '').slice(0, 100),
    title: validated.title?.slice(0, 50),
  };

  const response = await api.post<SocialLink>('/social-links', payload);
  
  if (!response.data) {
    throw new Error('Failed to create social link');
  }

  return SocialLinkSchema.parse(response.data);
}

/**
 * Get all social links for current user
 */
export async function getMyLinks(): Promise<SocialLink[]> {
  const response = await api.get<SocialLink[]>('/social-links/my-links');
  
  if (!response.data) {
    return [];
  }

  return response.data;
}

/**
 * Get social links for a specific profile
 */
export async function getProfileLinks(profileId: string): Promise<SocialLink[]> {
  const response = await api.get<SocialLink[]>(
    `/social-links/profile/${profileId}`,
  );
  
  if (!response.data) {
    return [];
  }

  return response.data;
}

/**
 * Update a social link
 */
export async function updateSocialLink(
  id: string,
  input: Partial<CreateSocialLinkInput>,
): Promise<SocialLink> {
  const response = await api.put<SocialLink>(`/social-links/${id}`, input);
  
  if (!response.data) {
    throw new Error('Failed to update social link');
  }

  return SocialLinkSchema.parse(response.data);
}

/**
 * Reorder social links by providing an ordered array of link IDs
 */
export async function reorderSocialLinks(linkIds: string[]): Promise<void> {
  await api.patch('/social-links/reorder', { linkIds });
}

/**
 * Delete a social link
 */
export async function deleteSocialLink(id: string): Promise<void> {
  await api.delete(`/social-links/${id}`);
}

/**
 * Track a click on a social link
 */
export async function trackLinkClick(id: string): Promise<void> {
  try {
    await api.post(`/social-links/${id}/track-click`, {});
  } catch {
    // Silently fail - tracking shouldn't break the user experience
  }
}

// ============ URL Metadata ============

export interface UrlMetadata {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
  type: string | null;
  favicon: string | null;
  domain: string;
}

/**
 * Fetch metadata (title, description, image) for a given URL
 */
export async function fetchUrlMetadata(url: string): Promise<UrlMetadata> {
  const response = await api.get<UrlMetadata>('/utils/url-metadata', { url });

  if (!response.data) {
    throw new Error('Failed to fetch URL metadata');
  }

  return response.data;
}

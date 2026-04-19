export const API_URL = '/api/v1';

export const API_BACKEND_URL =
  process.env.API_BACKEND_URL || process.env.API_URL || 'http://localhost:3001';

export const DEVELOPERS_URL =
  process.env.NEXT_PUBLIC_DEVELOPERS_URL || 'https://localhost:3004';

export function buildApiPath(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return clean.startsWith('/auth/') ? `/api${clean}` : `${API_URL}${clean}`;
}

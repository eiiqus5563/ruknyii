/**
 * ⚙️ Business App Configuration
 */

// API URL for fetch requests (relative - uses BFF proxy)
export const API_URL = '/api/v1';

// API Backend URL for server-side proxy
export const API_BACKEND_URL =
  process.env.API_BACKEND_URL || process.env.API_URL || 'http://localhost:3001';

// Business app URL
export const BUSINESS_URL =
  process.env.NEXT_PUBLIC_BUSINESS_URL || 'http://localhost:3003';

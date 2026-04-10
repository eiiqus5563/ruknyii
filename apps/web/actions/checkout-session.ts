'use server';

import { cookies } from 'next/headers';
import { getUserOptional } from '@/lib/dal';

export interface CheckoutUserInfo {
  isLoggedIn: boolean;
  userId?: string;
  fullName?: string;
  phone?: string;
  email?: string;
  accessToken?: string;
}

/**
 * Get logged-in user info + access token for checkout.
 * Returns null if not authenticated.
 */
export async function getCheckoutUserInfo(): Promise<CheckoutUserInfo> {
  const user = await getUserOptional();
  if (!user) {
    return { isLoggedIn: false };
  }

  const cookieStore = await cookies();
  const accessToken =
    cookieStore.get('__Secure-access_token')?.value ||
    cookieStore.get('access_token')?.value;

  return {
    isLoggedIn: true,
    userId: user.id,
    fullName: user.name || user.username || '',
    phone: user.phone || undefined,
    email: user.email,
    accessToken: accessToken || undefined,
  };
}

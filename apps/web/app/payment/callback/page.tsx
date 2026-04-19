'use client';

import { Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

/**
 * /payment/callback
 * This page is the redirect_url for Qaseh. 
 * The backend /payments/qaseh/callback handles verification and redirects here.
 * This is a fallback in case the user lands here directly.
 */
function PaymentCallbackContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    // Check if we have pending payment info from before redirect
    const pendingStr = typeof window !== 'undefined'
      ? localStorage.getItem('rukny_pending_payment')
      : null;

    if (pendingStr) {
      try {
        const pending = JSON.parse(pendingStr);
        localStorage.removeItem('rukny_pending_payment');

        // Redirect to success page
        const orderNums = (pending.orderNumbers || []).join(',');
        router.replace(
          `/payment/success?orders=${encodeURIComponent(orderNums)}&phone=${encodeURIComponent(pending.phone || '')}&store=${encodeURIComponent(pending.storeUsername || '')}&paid=1`,
        );
        return;
      } catch {
        // Fall through
      }
    }

    // No pending payment info, redirect to home
    router.replace('/');
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-zinc-900 gap-4">
      <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      <p className="text-[14px] text-zinc-500 dark:text-zinc-400">جاري التحقق من الدفع...</p>
    </div>
  );
}

export default function PaymentCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      }
    >
      <PaymentCallbackContent />
    </Suspense>
  );
}

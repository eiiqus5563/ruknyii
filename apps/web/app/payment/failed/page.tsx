'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { XCircle, ArrowRight, RefreshCcw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

function PaymentFailedContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const orderNumber = searchParams.get('order') ?? '';
  const status = searchParams.get('status') ?? '';
  const error = searchParams.get('error') ?? '';

  const getErrorMessage = () => {
    if (error === 'missing_params') return 'معلومات الدفع غير مكتملة';
    if (error === 'order_not_found') return 'الطلب غير موجود';
    if (error === 'processing_error') return 'حدث خطأ في معالجة الدفع';
    if (status === 'FAILED') return 'فشلت عملية الدفع';
    return 'لم تكتمل عملية الدفع';
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-900 flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="flex items-center justify-center w-20 h-20 rounded-full bg-red-50 dark:bg-red-900/20 mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-500 dark:text-red-400" />
        </div>

        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
          فشل الدفع
        </h1>

        <p className="text-[14px] text-zinc-500 dark:text-zinc-400 mb-2">
          {getErrorMessage()}
        </p>

        {orderNumber && (
          <p className="text-[13px] text-zinc-400 dark:text-zinc-500 mb-6">
            رقم الطلب: <span className="font-mono font-medium text-zinc-600 dark:text-zinc-300">{orderNumber}</span>
          </p>
        )}

        {!orderNumber && <div className="mb-6" />}

        <div className="space-y-3">
          {orderNumber && (
            <button
              onClick={() => router.push('/')}
              className="w-full h-[48px] bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 rounded-full text-[14px] font-semibold inline-flex items-center justify-center gap-2 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-all"
            >
              <RefreshCcw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          )}

          <button
            onClick={() => router.push('/')}
            className={cn(
              'w-full h-[48px] rounded-full text-[14px] font-semibold inline-flex items-center justify-center gap-2 transition-all',
              orderNumber
                ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white hover:bg-zinc-200 dark:hover:bg-zinc-700'
                : 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100',
            )}
          >
            <ArrowRight className="w-4 h-4" />
            العودة للرئيسية
          </button>
        </div>

        <p className="text-[12px] text-zinc-400 dark:text-zinc-500 mt-6">
          لم يتم خصم أي مبلغ من حسابك. يمكنك إعادة المحاولة أو اختيار طريقة دفع أخرى.
        </p>
      </div>
    </div>
  );
}

export default function PaymentFailedPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-zinc-900">
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        </div>
      }
    >
      <PaymentFailedContent />
    </Suspense>
  );
}

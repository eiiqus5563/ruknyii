'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { generateFormSlug } from '@/lib/utils/generateFormSlug';

// Redirect old /new route to /create/[slug]
export default function NewProductPage() {
  const router = useRouter();

  useEffect(() => {
    const slug = generateFormSlug();
    router.replace(`/app/store/products/create/${slug}?new=true`);
  }, [router]);

  return (
    <div className="relative flex h-[calc(100%-1rem)] flex-1 min-w-0 bg-card m-2 md:ms-0 rounded-2xl border border-border/50 overflow-hidden" dir="rtl">
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-muted-foreground">جاري التحميل...</p>
        </div>
      </div>
    </div>
  );
}

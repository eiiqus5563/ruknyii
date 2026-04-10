'use client';

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { ProfileHeader } from '@/components/(app)/link';
import { useToast } from '@/components/ui/toast';

export default function LinksPage() {
  const searchParams = useSearchParams();
  const { show: showToast } = useToast();

  // Handle Instagram OAuth callback
  useEffect(() => {
    const igStatus = searchParams.get('instagram');
    const igUsername = searchParams.get('username');

    if (igStatus === 'success') {
      showToast({
        title: 'تم ربط إنستغرام',
        message: igUsername
          ? `تم ربط حساب @${igUsername} بنجاح`
          : 'تم ربط حساب إنستغرام بنجاح',
        variant: 'success',
      });
      window.history.replaceState({}, '', '/app/links');
    } else if (igStatus === 'error') {
      showToast({
        title: 'خطأ في ربط إنستغرام',
        message: 'فشل ربط حساب إنستغرام. حاول مرة أخرى.',
        variant: 'error',
      });
      window.history.replaceState({}, '', '/app/links');
    }
  }, [searchParams, showToast]);

  // Handle LinkedIn OAuth callback
  useEffect(() => {
    const liStatus = searchParams.get('linkedin');

    if (liStatus === 'success') {
      showToast({
        title: 'تم ربط لينكدإن',
        message: 'تم ربط حساب لينكدإن بنجاح',
        variant: 'success',
      });
      window.history.replaceState({}, '', '/app/links');
    } else if (liStatus === 'error') {
      showToast({
        title: 'خطأ في ربط لينكدإن',
        message: 'فشل ربط حساب لينكدإن. حاول مرة أخرى.',
        variant: 'error',
      });
      window.history.replaceState({}, '', '/app/links');
    }
  }, [searchParams, showToast]);

  return (
    <div className="space-y-6">
      <ProfileHeader />
    </div>
  );
}

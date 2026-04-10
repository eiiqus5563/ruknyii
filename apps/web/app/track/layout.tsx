import type { ReactNode } from 'react';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'تتبع الطلب | ركني',
  description: 'تتبع حالة طلبك بسهولة عبر رقم الهاتف',
};

export default function TrackLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

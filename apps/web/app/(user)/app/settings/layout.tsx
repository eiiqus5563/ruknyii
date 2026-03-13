'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePhonePreview } from '@/components/(app)/shared/phone-preview-context';
import { SettingsSidebarSlider } from '@/components/(app)/settings/SettingsSidebar';
import { SettingsMobileHome } from '@/components/(app)/settings/SettingsMobileHome';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { collapsed } = usePhonePreview();
  // Support both /app/settings (localhost) and /settings (production subdomain)
  const isSettingsRoot = pathname === '/app/settings' || pathname === '/settings';

  return (
    <>
      {/* Mobile: Settings Home (card list) — only on root /app/settings */}
      {isSettingsRoot && (
        <div className="lg:hidden">
          <SettingsMobileHome />
        </div>
      )}

      {/* Desktop layout + mobile sub-pages */}
      <div className={cn(
        'flex gap-4 mt-6 min-h-[calc(100vh-5rem)]',
        collapsed && 'max-w-7xl',
        isSettingsRoot && 'hidden lg:flex'
      )}>
        {/* Main Content */}
        <div className="flex-1 min-w-0 pb-6 lg:pb-0">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { Sidebar } from './dashboard-sidebar';
import { SettingsSidebarDesktop } from '@/components/(app)/settings/SettingsSidebar';

export function SidebarWrapper() {
  const pathname = usePathname();
  const isSettings = pathname?.startsWith('/app/settings') || pathname?.startsWith('/settings');

  if (isSettings) {
    return (
      <div className="hidden md:flex">
        <SettingsSidebarDesktop />
      </div>
    );
  }

  return (
    <div className="hidden md:block">
      <Sidebar />
    </div>
  );
}

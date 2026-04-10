import type { ReactNode } from 'react';
import { requireCompleteProfile } from '@/lib/dal';
import { SidebarWrapper } from '@/components/(app)/dashboard/sidebar-wrapper';
import { DashboardNav } from '@/components/(app)/dashboard/dashboard-nav';
import { CollapsiblePhonePreview } from '@/components/(app)/shared/CollapsiblePhonePreview';
import { MobileDock } from '@/components/(app)/dashboard/mobile-dock';

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireCompleteProfile();

  return (
    <div lang="ar" dir="rtl" className="flex h-dvh bg-background">
      {/* Sidebar - Settings or Dashboard */}
      <SidebarWrapper />

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex gap-1.5 p-1.5 sm:gap-2 sm:p-2 md:ps-0">
        {/* CollapsiblePhonePreview wraps content + preview for shared context */}
        <CollapsiblePhonePreview>
          {/* Card Container */}
          <div className="flex-1 min-w-0 relative h-full bg-card rounded-3xl sm:rounded-4xl border border-border/50 overflow-clip transition-all duration-300">
            {/* Floating Nav */}
            <DashboardNav />

            {/* Scrollable content */}
            <main className="h-full overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="mx-auto w-full max-w-7xl px-3 pt-14 pb-24 sm:px-4 sm:pb-12 md:px-6 md:pb-6">
                {children}
              </div>
            </main>
          </div>
        </CollapsiblePhonePreview>
      </div>

      {/* Mobile Bottom Dock */}
      <MobileDock />
    </div>
  );
}

"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { DashboardNav } from "@/components/dashboard-nav";
import { MobileDock } from "@/components/mobile-dock";
import { ActivityPanel, MobileActivitySheet } from "@/components/activity-panel";
import { AppGate } from "@/components/app-gate";
import { cn } from "@/lib/utils";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const pathname = usePathname();

  const togglePanel = useCallback(() => setPanelOpen((v) => !v), []);
  const toggleMobileSheet = useCallback(() => setMobileSheetOpen((v) => !v), []);

  // Hide sidebar on the apps list page (/app) and create page (/app/new)
  const isAppsListPage = pathname === "/app" || pathname === "/app/new";

  return (
    <AppGate>
      <div className="flex h-dvh bg-background">
        {/* Sidebar — hidden on apps list */}
        {!isAppsListPage && <Sidebar />}

        {/* Main content area */}
        <div className="flex-1 min-w-0 flex p-1.5 sm:p-2 md:ps-0">
          {/* Card container */}
          <div className={cn(
            "flex-1 min-w-0 relative h-full bg-surface border border-border/50 overflow-clip transition-all duration-300",
            isAppsListPage
              ? "rounded-3xl sm:rounded-[2rem] md:ms-2"
              : "rounded-3xl sm:rounded-[2rem]",
          )}>
            {/* Floating nav */}
            <DashboardNav onBellClick={togglePanel} onMobileBellClick={toggleMobileSheet} />

            {/* Scrollable content */}
            <main className="h-full overflow-y-auto overscroll-contain [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <div className="mx-auto w-full max-w-7xl px-3 pt-14 pb-24 sm:px-4 sm:pb-12 md:px-6 md:pb-6">
                {children}
              </div>
            </main>
          </div>

          {/* Desktop activity panel */}
          <ActivityPanel open={panelOpen} onClose={() => setPanelOpen(false)} />
        </div>

        {/* Mobile activity sheet */}
        <MobileActivitySheet open={mobileSheetOpen} onClose={() => setMobileSheetOpen(false)} />

        {/* Mobile bottom dock — hidden on apps list */}
        {!isAppsListPage && <MobileDock />}
      </div>
    </AppGate>
  );
}

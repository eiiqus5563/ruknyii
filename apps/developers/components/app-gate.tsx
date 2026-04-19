"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useApps } from "@/lib/hooks/use-apps";
import { Spinner } from "@heroui/react";
import { FirstAppSetup } from "@/components/first-app-setup";

/**
 * AppGate — wraps all /app/* routes.
 *
 * Security layers:
 * 1. Auth check — not authenticated → middleware already redirects to /login
 * 2. Apps check — no apps exist → shows FirstAppSetup (no sidebar, no nav)
 * 3. AppId ownership — /app/[appId]/* → validated in [appId]/layout.tsx
 *
 * This prevents users from seeing dashboard/api-keys when they have no apps.
 */
export function AppGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { data: apps, isLoading: appsLoading, isError } = useApps();

  const isReady = !authLoading && !appsLoading;
  const hasApps = !!apps?.length;

  // Only /app/new is allowed without apps (for the create flow)
  const isAllowedWithoutApps = pathname === "/app/new";

  // If not authenticated and not loading, middleware handles redirect
  // This is a safety net
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace("/login?session=expired");
    }
  }, [authLoading, isAuthenticated, router]);

  // Loading state — clean centered spinner
  if (!isReady) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // Error state — show retry
  if (isError) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="text-sm text-danger">Failed to load apps</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="text-sm text-accent hover:underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // No apps and trying to access app-specific routes → show first-app setup
  if (!hasApps && !isAllowedWithoutApps) {
    return <FirstAppSetup />;
  }

  // Has apps or on allowed routes → render normally
  return <>{children}</>;
}

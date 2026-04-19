"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApps } from "@/lib/hooks/use-apps";
import { useAuth } from "@/providers/auth-provider";
import { Spinner } from "@heroui/react";

/**
 * Layout guard for /app/[appId]/* routes.
 *
 * Security: Validates the appId in the URL belongs to the current user's apps.
 * If the appId is invalid or doesn't belong to the user → redirect to /app.
 * This prevents URL manipulation to access other users' app dashboards.
 */
export default function AppIdLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const router = useRouter();
  const appId = params?.appId as string | undefined;
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const { data: apps, isLoading: appsLoading } = useApps();

  const [validated, setValidated] = useState(false);

  useEffect(() => {
    if (authLoading || appsLoading) return;

    if (!isAuthenticated) {
      router.replace("/login?session=expired");
      return;
    }

    if (!appId) {
      router.replace("/app");
      return;
    }

    // Validate that the appId belongs to the current user
    const ownsApp = apps?.some((a) => a.appId === appId);
    if (!ownsApp) {
      router.replace("/app");
      return;
    }

    setValidated(true);
  }, [authLoading, appsLoading, isAuthenticated, appId, apps, router]);

  if (!validated) {
    return (
      <div className="flex items-center justify-center py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return <>{children}</>;
}

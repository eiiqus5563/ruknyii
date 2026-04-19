"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function RedirectToCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    router.replace(`/callback${params ? `?${params}` : ""}`);
  }, [router, searchParams]);

  return null;
}

export default function AuthCallbackRedirect() {
  return (
    <Suspense>
      <RedirectToCallback />
    </Suspense>
  );
}

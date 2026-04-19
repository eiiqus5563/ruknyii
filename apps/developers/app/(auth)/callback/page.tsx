"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { Button, Alert, Spinner } from "@heroui/react";
import { ArrowLeft, ArrowRight } from "lucide-react";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { handleOAuthCallback } = useAuth();
  const { t, dir } = useLocale();

  const [error, setError] = useState<string | null>(null);
  const exchangeAttemptedRef = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    const errorParam = searchParams.get("error");

    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      return;
    }
    if (!code) {
      setError(t.auth.callback.noCode);
      return;
    }
    if (exchangeAttemptedRef.current) return;

    const exchangeCode = async () => {
      exchangeAttemptedRef.current = true;
      try {
        const response = await handleOAuthCallback(code);
        if (response.needsProfileCompletion) {
          router.push("/complete-profile");
        } else {
          const stored = sessionStorage.getItem("oauth_callback");
          sessionStorage.removeItem("oauth_callback");
          router.push(stored || "/app");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : t.auth.callback.error);
      }
    };

    exchangeCode();
  }, [searchParams, handleOAuthCallback, router, t]);

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-6">
        <Alert status="danger" className="w-full">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t.auth.callback.error}</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>

        <div className="flex w-full flex-col gap-3">
          <Button
            variant="primary"
            onPress={() => {
              exchangeAttemptedRef.current = false;
              setError(null);
              router.push("/login");
            }}
            className="h-12 w-full rounded-full text-sm font-medium"
          >
            {t.auth.callback.retry}
          </Button>
          <Button
            variant="ghost"
            onPress={() => router.push("/login")}
            className="h-12 w-full rounded-full text-sm font-medium"
          >
            <BackArrow className="size-4" />
            {t.auth.callback.backToLogin}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted">{t.auth.callback.verifying}</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <CallbackContent />
    </Suspense>
  );
}

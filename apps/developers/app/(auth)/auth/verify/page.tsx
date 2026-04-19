"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { Button, Alert, Spinner } from "@heroui/react";
import { ArrowLeft, ArrowRight } from "lucide-react";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyMagicLink } = useAuth();
  const { t, dir } = useLocale();

  const [error, setError] = useState<string | null>(null);
  const verifyAttemptedRef = useRef(false);

  useEffect(() => {
    const token = searchParams.get("token");
    if (!token) {
      setError(t.auth.verify.expired);
      return;
    }
    if (verifyAttemptedRef.current) return;

    const verify = async () => {
      verifyAttemptedRef.current = true;
      try {
        const response = await verifyMagicLink(token);
        if (response.needsProfileCompletion) {
          router.push("/complete-profile");
        } else {
          router.push("/app");
        }
      } catch {
        setError(t.auth.verify.expired);
      }
    };

    verify();
  }, [searchParams, verifyMagicLink, router, t]);

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-6">
        <Alert status="danger" className="w-full">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Title>{t.auth.verify.error}</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>

        <Button
          variant="ghost"
          onPress={() => router.push("/login")}
          className="h-12 w-full rounded-full text-sm font-medium"
        >
          <BackArrow className="size-4" />
          {t.auth.verify.backToLogin}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4">
      <Spinner className="size-8" />
      <p className="text-sm text-muted">{t.auth.verify.verifying}</p>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}

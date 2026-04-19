"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "@/providers/locale-provider";
import { verify2FALogin } from "@/lib/api/auth";
import { setCsrfToken, updateLastRefreshTime } from "@/lib/api-client";
import { InputOTP, Button, Alert, Spinner } from "@heroui/react";
import { ArrowLeft, ArrowRight, ShieldCheck } from "lucide-react";

function Verify2FAContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, dir } = useLocale();

  const sessionId = searchParams.get("session") || "";
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Redirect if no session ID
  useEffect(() => {
    if (!sessionId) {
      router.replace("/login");
    }
  }, [sessionId, router]);

  if (!sessionId) {
    return null;
  }

  const handleVerify = async (value: string) => {
    if (value.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      const response = await verify2FALogin(value, sessionId, true);
      if (response.csrf_token) {
        setCsrfToken(response.csrf_token);
        updateLastRefreshTime();
      }
      if (response.needsProfileCompletion) {
        router.push("/complete-profile");
      } else {
        router.push("/app");
      }
    } catch {
      setError(t.auth.verify2fa.invalidCode);
      setCode("");
    } finally {
      setVerifying(false);
    }
  };

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Icon */}
      <div className="flex size-16 items-center justify-center rounded-full bg-default">
        <ShieldCheck className="size-7 text-foreground" />
      </div>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t.auth.verify2fa.title}
        </h1>
        <p className="mt-2 text-sm text-muted">{t.auth.verify2fa.subtitle}</p>
      </div>

      {/* Error */}
      {error && (
        <Alert status="danger" className="w-full">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* OTP Input */}
      <div dir="ltr" className="flex flex-col items-center gap-4">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={(val: string) => {
            setCode(val);
            setError(null);
          }}
          onComplete={handleVerify}
          isDisabled={verifying}
        >
          <InputOTP.Group>
            <InputOTP.Slot index={0} />
            <InputOTP.Slot index={1} />
            <InputOTP.Slot index={2} />
          </InputOTP.Group>
          <InputOTP.Separator />
          <InputOTP.Group>
            <InputOTP.Slot index={3} />
            <InputOTP.Slot index={4} />
            <InputOTP.Slot index={5} />
          </InputOTP.Group>
        </InputOTP>
      </div>

      {/* Actions */}
      <div className="flex w-full flex-col gap-3">
        <Button
          variant="primary"
          onPress={() => handleVerify(code)}
          isDisabled={code.length !== 6 || verifying}
          className="h-12 w-full rounded-full text-sm font-medium"
        >
          {verifying ? <Spinner className="size-4" /> : null}
          {verifying ? t.auth.verify2fa.verifying : t.auth.verify2fa.verify}
        </Button>

        <Button
          variant="ghost"
          onPress={() => router.push("/verify-identity")}
          className="h-12 w-full rounded-full text-sm font-medium"
        >
          <BackArrow className="size-4" />
          {t.auth.verify2fa.useRecovery}
        </Button>
      </div>
    </div>
  );
}

export default function Verify2FAPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <Verify2FAContent />
    </Suspense>
  );
}

"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import { Button, Alert, Spinner } from "@heroui/react";
import { Mail, ArrowLeft, ArrowRight, RotateCw } from "lucide-react";

function CheckEmailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { t, dir } = useLocale();
  const { sendMagicLink } = useAuth();

  const email = searchParams.get("email") || "";

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState("");
  const [canResend, setCanResend] = useState(false);
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (!email) {
      router.replace("/login");
    }
  }, [email, router]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const handleResend = async () => {
    if (!canResend || resending) return;
    setResending(true);
    setResendSuccess(false);
    setResendError("");
    try {
      await sendMagicLink(email);
      setResendSuccess(true);
      setCanResend(false);
      setCountdown(60);
    } catch {
      setResendError(t.auth.checkEmail.resendFailed);
    } finally {
      setResending(false);
    }
  };

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Icon */}
      <div className="flex size-16 items-center justify-center rounded-full bg-default">
        <Mail className="size-7 text-foreground" />
      </div>

      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t.auth.checkEmail.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {t.auth.checkEmail.subtitle}
        </p>
        <p className="mt-1 text-sm font-medium text-foreground">{email}</p>
      </div>

      {/* Instructions */}
      <div className="flex flex-col gap-1 text-center">
        <p className="text-sm text-muted">{t.auth.checkEmail.clickLink}</p>
        <p className="text-xs text-muted">{t.auth.checkEmail.linkExpiry}</p>
      </div>

      {/* Feedback */}
      {resendSuccess && (
        <Alert status="success" className="w-full">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{t.auth.checkEmail.resendSuccess}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}
      {resendError && (
        <Alert status="danger" className="w-full">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{resendError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex w-full flex-col gap-3">
        <Button
          variant="primary"
          onPress={handleResend}
          isDisabled={!canResend || resending}
          className="h-12 w-full rounded-full text-sm font-medium"
        >
          {resending ? (
            <Spinner className="size-4" />
          ) : (
            <RotateCw className="size-4" />
          )}
          {!canResend && countdown > 0
            ? `${t.auth.checkEmail.resendCountdown} ${countdown}s`
            : resending
              ? t.auth.checkEmail.resending
              : t.auth.checkEmail.resendLink}
        </Button>

        <Button
          variant="ghost"
          onPress={() => router.push("/login")}
          className="h-12 w-full rounded-full text-sm font-medium"
        >
          <BackArrow className="size-4" />
          {t.auth.checkEmail.changeEmail}
        </Button>

        <Button
          variant="ghost"
          onPress={() => {
            const q = new URLSearchParams();
            if (email) q.set("email", email);
            const type = searchParams.get("type");
            if (type) q.set("type", type);
            router.push(`/verify-identity?${q.toString()}`);
          }}
          className="h-12 w-full rounded-full text-sm font-medium"
        >
          {t.auth.checkEmail.tryAnother}
        </Button>
      </div>
    </div>
  );
}

export default function CheckEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <CheckEmailContent />
    </Suspense>
  );
}

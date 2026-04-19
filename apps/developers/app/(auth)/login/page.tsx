"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { getGoogleAuthUrl, getLinkedInAuthUrl } from "@/lib/api/auth";
import { resetRefreshState } from "@/lib/api-client";
import {
  TextField,
  Label,
  Input,
  Button,
  Alert,
  Spinner,
} from "@heroui/react";
import { Mail } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { sendMagicLink, isLoading, error, clearError, isAuthenticated, isLoading: authLoading } = useAuth();
  const { t } = useLocale();

  const [email, setEmail] = useState("");
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/app");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    const sessionParam = searchParams.get("session");
    if (sessionParam === "expired") setSessionMessage("Session expired. Please sign in again.");
    else if (sessionParam === "invalid") setSessionMessage("Invalid session. Please sign in again.");
    resetRefreshState();
  }, [searchParams]);

  if (authLoading || isAuthenticated) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setSessionMessage(null);
    if (!email.trim()) return;
    try {
      const response = await sendMagicLink(email.trim());
      router.push(`/check-email?email=${encodeURIComponent(email.trim())}&type=${response.type}`);
    } catch {
      /* error is set in auth provider */
    }
  };

  const handleGoogleLogin = () => {
    sessionStorage.setItem("oauth_callback", "/app");
    window.location.href = getGoogleAuthUrl();
  };

  const handleLinkedInLogin = () => {
    sessionStorage.setItem("oauth_callback", "/app");
    window.location.href = getLinkedInAuthUrl();
  };

  const displayError = sessionMessage || error;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t.auth.login.title}
        </h1>
        <p className="mt-2 text-sm text-muted">{t.auth.login.subtitle}</p>
      </div>

      {/* Error */}
      {displayError && (
        <Alert status="danger" className="w-full">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{displayError}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      {/* Email form */}
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
        <TextField className="w-full">
          <Label className="text-sm font-medium text-foreground">
            {t.auth.login.emailLabel}
          </Label>
          <Input
            type="email"
            placeholder={t.auth.login.emailPlaceholder}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            autoFocus
            className="h-12 rounded-full px-4"
          />
        </TextField>

        <Button
          type="submit"
          variant="primary"
          isDisabled={isLoading || !email.trim()}
          className="h-12 w-full rounded-full text-sm font-medium"
        >
          {isLoading ? <Spinner className="size-4" /> : null}
          <Mail className="size-4" />
          {t.auth.login.continueWithEmail}
        </Button>
      </form>

      {/* Divider */}
      <div className="flex w-full items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted">{t.auth.login.orContinueWith}</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* OAuth buttons */}
      <div className="flex w-full flex-col gap-3">
        <Button
          variant="outline"
          onPress={handleGoogleLogin}
          className="h-12 w-full rounded-full text-sm font-medium"
        >
          <svg className="size-5" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          {t.auth.login.google}
        </Button>

        <Button
          variant="outline"
          onPress={handleLinkedInLogin}
          className="h-12 w-full rounded-full text-sm font-medium"
        >
          <svg className="size-5" viewBox="0 0 24 24" fill="#0A66C2">
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          {t.auth.login.linkedin}
        </Button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Spinner />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}

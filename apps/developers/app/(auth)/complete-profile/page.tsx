"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/providers/auth-provider";
import { useLocale } from "@/providers/locale-provider";
import { checkUsername, type CompleteProfileInput } from "@/lib/api/auth";
import {
  TextField,
  Label,
  Input,
  Description,
  FieldError,
  Button,
  Spinner,
} from "@heroui/react";
import { User, AtSign, Check, X } from "lucide-react";

export default function CompleteProfilePage() {
  const router = useRouter();
  const { user, completeUserProfile, completeOAuthProfile, isLoading } = useAuth();
  const { t } = useLocale();

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [usernameStatus, setUsernameStatus] = useState<
    "idle" | "checking" | "available" | "taken"
  >("idle");
  const [errors, setErrors] = useState<{ name?: string; username?: string }>({});
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (user?.name && user?.username && user?.profileCompleted) {
      router.replace("/app");
    }
  }, [user, router]);

  const checkUsernameAvailability = useCallback(
    async (value: string) => {
      if (value.length < 3) {
        setUsernameStatus("idle");
        return;
      }
      setUsernameStatus("checking");
      try {
        const result = await checkUsername(value);
        setUsernameStatus(result.available ? "available" : "taken");
      } catch {
        setUsernameStatus("idle");
      }
    },
    []
  );

  const handleUsernameChange = (value: string) => {
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    setUsername(sanitized);
    setErrors((prev) => ({ ...prev, username: undefined }));

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (sanitized.length >= 3) {
      debounceRef.current = setTimeout(
        () => checkUsernameAvailability(sanitized),
        500
      );
    } else {
      setUsernameStatus("idle");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; username?: string } = {};
    if (!name.trim()) newErrors.name = "Name is required";
    if (!username.trim()) newErrors.username = "Username is required";
    else if (username.length < 3) newErrors.username = "At least 3 characters";
    else if (usernameStatus === "taken") newErrors.username = t.auth.completeProfile.usernameTaken;
    if (Object.keys(newErrors).length) {
      setErrors(newErrors);
      return;
    }

    const input: CompleteProfileInput = { name: name.trim(), username: username.trim() };
    try {
      if (user?.profileCompleted === false) {
        await completeOAuthProfile(input);
      } else {
        await completeUserProfile(input);
      }
      router.push("/app");
    } catch {
      /* error handled in provider */
    }
  };

  const usernameStatusIcon =
    usernameStatus === "checking" ? (
      <Spinner className="size-4" />
    ) : usernameStatus === "available" ? (
      <Check className="size-4 text-green-600" />
    ) : usernameStatus === "taken" ? (
      <X className="size-4 text-red-500" />
    ) : null;

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {t.auth.completeProfile.title}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {t.auth.completeProfile.subtitle}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="flex w-full flex-col gap-5">
        <TextField isInvalid={!!errors.name} className="w-full">
          <Label className="text-sm font-medium text-foreground">
            <User className="inline size-4 ltr:mr-1.5 rtl:ml-1.5" />
            {t.auth.completeProfile.nameLabel}
          </Label>
          <Input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setErrors((prev) => ({ ...prev, name: undefined }));
            }}
            placeholder={t.auth.completeProfile.namePlaceholder}
            autoFocus
            className="h-12 rounded-full px-4"
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </TextField>

        <TextField isInvalid={!!errors.username || usernameStatus === "taken"} className="w-full">
          <Label className="text-sm font-medium text-foreground">
            <AtSign className="inline size-4 ltr:mr-1.5 rtl:ml-1.5" />
            {t.auth.completeProfile.usernameLabel}
          </Label>
          <div className="relative">
            <Input
              value={username}
              onChange={(e) => handleUsernameChange(e.target.value)}
              placeholder={t.auth.completeProfile.usernamePlaceholder}
              className="h-12 rounded-full px-4 ltr:pr-10 rtl:pl-10"
            />
            {usernameStatusIcon && (
              <div className="pointer-events-none absolute top-1/2 -translate-y-1/2 ltr:right-4 rtl:left-4">
                {usernameStatusIcon}
              </div>
            )}
          </div>
          {usernameStatus === "available" && (
            <Description className="text-xs text-green-600">
              {t.auth.completeProfile.usernameAvailable}
            </Description>
          )}
          {usernameStatus === "taken" && (
            <FieldError>{t.auth.completeProfile.usernameTaken}</FieldError>
          )}
          {usernameStatus === "idle" && !errors.username && (
            <Description className="text-xs text-muted">
              {t.auth.completeProfile.usernameHint}
            </Description>
          )}
          {errors.username && usernameStatus !== "taken" && (
            <FieldError>{errors.username}</FieldError>
          )}
        </TextField>

        <Button
          type="submit"
          variant="primary"
          isDisabled={isLoading || usernameStatus === "taken"}
          className="mt-2 h-12 w-full rounded-full text-sm font-medium"
        >
          {isLoading ? <Spinner className="size-4" /> : null}
          {t.auth.completeProfile.continue}
        </Button>
      </form>
    </div>
  );
}

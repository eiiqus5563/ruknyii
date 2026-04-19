"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Button,
  Chip,
  Alert,
  Label,
  Description,
  TextField,
  Input,
  CheckboxGroup,
  Checkbox,
  Separator,
} from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  Key,
  Shield,
  Lock,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { useApiKey, useUpdateApiKey } from "@/lib/hooks/use-api-keys";
import { useApp } from "@/lib/hooks/use-apps";
import { ALL_SCOPES } from "@/lib/api/api-keys";
import { cn } from "@/lib/utils";

export default function EditApiKeyPage() {
  const router = useRouter();
  const params = useParams();
  const slug = params.id as string;
  const appId = params.appId as string;

  const { t, dir } = useLocale();
  const s = t.dashboard.apiKeys as Record<string, any>;
  const cm = s.createModal as Record<string, string>;
  const ep = s.editPage as Record<string, string>;
  const scopeLabels = s.scopeLabels as Record<string, string>;

  const { data: app } = useApp(appId);
  const developerAppId = app?.id;
  const { data: apiKey, isLoading } = useApiKey(slug, developerAppId);
  const updateMutation = useUpdateApiKey(developerAppId);

  /* ── Form state ── */
  const [name, setName] = useState("");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [ipInput, setIpInput] = useState("");
  const [ipList, setIpList] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  /* ── Populate form when key loads ── */
  useEffect(() => {
    if (apiKey && !initialized) {
      setName(apiKey.name);
      setSelectedScopes(apiKey.scopes);
      setIpList(apiKey.ipAllowlist ?? []);
      setInitialized(true);
    }
  }, [apiKey, initialized]);

  const handleAddIp = useCallback(() => {
    const trimmed = ipInput.trim();
    if (trimmed && !ipList.includes(trimmed)) {
      setIpList((prev) => [...prev, trimmed]);
      setIpInput("");
    }
  }, [ipInput, ipList]);

  const handleRemoveIp = useCallback((ip: string) => {
    setIpList((prev) => prev.filter((i) => i !== ip));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!name.trim()) return;
    setError(null);
    try {
      await updateMutation.mutateAsync({
        keySlug: slug,
        input: {
          name: name.trim(),
          scopes: selectedScopes,
          ipAllowlist: ipList,
        },
      });
      router.push(`/app/${appId}/api-keys`);
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    }
  }, [name, selectedScopes, ipList, slug, updateMutation, router]);

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div className="mt-2 sm:mt-10 max-w-2xl mx-auto animate-pulse">
        <div className="mb-8">
          <div className="h-4 w-32 rounded bg-default/60 mb-4" />
          <div className="h-7 w-48 rounded-lg bg-default/70 mb-2" />
          <div className="h-4 w-72 rounded bg-default/50" />
        </div>
        <div className="space-y-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border border-border/30 bg-background dark:bg-overlay p-5">
              <div className="h-5 w-24 rounded bg-default/60 mb-4" />
              <div className="h-10 w-full rounded-lg bg-default/40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Not found ── */
  if (!apiKey) {
    return (
      <div className="mt-2 sm:mt-10 max-w-2xl mx-auto">
        <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
          <div className="flex size-16 items-center justify-center rounded-2xl bg-danger/10 ring-1 ring-danger/20">
            <Key className="size-7 text-danger" />
          </div>
          <p className="text-base font-semibold text-foreground">{ep.notFound}</p>
          <Button
            variant="primary"
            onPress={() => router.push(`/app/${appId}/api-keys`)}
            className="rounded-full px-8"
          >
            {ep.goBack}
          </Button>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Form view                                                        */
  /* ================================================================ */
  return (
    <div className="mt-2 sm:mt-10 max-w-2xl mx-auto">
      {/* ── Header ── */}
      <div className="mb-8">
        <button
          type="button"
          onClick={() => router.push(`/app/${appId}/api-keys`)}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors mb-4"
        >
          <BackArrow className="size-4" />
          {ep.back}
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          {ep.heading}
        </h1>
        <p className="text-sm text-muted mt-1">{ep.description}</p>
      </div>

      {/* ── Error ── */}
      {error && (
        <Alert status="danger" className="mb-6">
          <Alert.Indicator />
          <Alert.Content>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Content>
        </Alert>
      )}

      <div className="space-y-6">
        {/* ─────────────── Section 1: Basics ─────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent/10">
              <Key className="size-3.5 text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {(s.createPage as Record<string, string>).basicsSection}
            </h2>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background dark:bg-overlay p-5">
            <TextField
              value={name}
              onChange={setName}
              isRequired
              autoFocus
            >
              <Label>{cm.nameLabel}</Label>
              <Input placeholder={cm.namePlaceholder} />
            </TextField>
          </div>
        </section>

        {/* ─────────────── Section 2: Permissions ─────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent/10">
              <Shield className="size-3.5 text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {(s.createPage as Record<string, string>).permissionsSection}
            </h2>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background dark:bg-overlay p-5">
            <CheckboxGroup
              value={selectedScopes}
              onChange={setSelectedScopes}
            >
              <Label>{cm.scopesLabel}</Label>
              <Description>
                {(s.createPage as Record<string, string>).scopesHelp}
              </Description>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                {ALL_SCOPES.map((scope) => (
                  <Checkbox key={scope} value={scope}>
                    <Checkbox.Control>
                      <Checkbox.Indicator />
                    </Checkbox.Control>
                    <Checkbox.Content>
                      <Label>{scopeLabels[scope] ?? scope}</Label>
                    </Checkbox.Content>
                  </Checkbox>
                ))}
              </div>
            </CheckboxGroup>
          </div>
        </section>

        {/* ─────────────── Section 3: Security ─────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent/10">
              <Lock className="size-3.5 text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">
              {(s.createPage as Record<string, string>).securitySection}
            </h2>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background dark:bg-overlay p-5">
            <p className="text-sm font-medium text-foreground mb-1">{cm.ipLabel}</p>
            <p className="text-xs text-muted mb-2">{cm.ipDesc}</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={ipInput}
                onChange={(e) => setIpInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddIp();
                  }
                }}
                placeholder={cm.ipPlaceholder}
                className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
              />
              <Button
                variant="secondary"
                onPress={handleAddIp}
                className="rounded-lg px-4"
              >
                {cm.addIp}
              </Button>
            </div>
            {ipList.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {ipList.map((ip) => (
                  <Chip key={ip} variant="soft" className="gap-1">
                    <span className="font-mono text-xs">{ip}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveIp(ip)}
                      className="ms-1 text-muted hover:text-danger"
                    >
                      ×
                    </button>
                  </Chip>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* ── Sticky Footer ── */}
      <div className="sticky bottom-0 z-20 -mx-3 sm:-mx-4 md:-mx-6 mt-6 bg-surface/90 backdrop-blur-xl border-t border-border/30">
        <div className="flex items-center justify-end gap-3 px-3 py-3 sm:px-4 md:px-6">
          <Button
            variant="ghost"
            onPress={() => router.push(`/app/${appId}/api-keys`)}
            className="rounded-full px-6"
          >
            {s.cancel}
          </Button>
          <Button
            variant="primary"
            onPress={handleSubmit}
            isDisabled={!name.trim() || updateMutation.isPending}
            isPending={updateMutation.isPending}
            className="rounded-full px-8"
          >
            {updateMutation.isPending ? ep.saving : ep.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

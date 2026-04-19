"use client";

import { useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  Button,
  Chip,
  Alert,
  Tooltip,
  Label,
  Description,
  TextField,
  Input,
  RadioGroup,
  Radio,
  CheckboxGroup,
  Checkbox,
  Separator,
  DatePicker,
  DateField,
  Calendar,
} from "@heroui/react";
import {
  ArrowLeft,
  ArrowRight,
  Key,
  Globe,
  FlaskConical,
  Shield,
  Lock,
  Copy,
  Check,
  ShieldAlert,
  CheckCircle2,
} from "lucide-react";
import { today, getLocalTimeZone } from "@internationalized/date";
import type { DateValue } from "@internationalized/date";
import { useLocale } from "@/providers/locale-provider";
import { useCreateApiKey } from "@/lib/hooks/use-api-keys";
import { useApp } from "@/lib/hooks/use-apps";
import { ALL_SCOPES, type ApiKeyEnvironment } from "@/lib/api/api-keys";
import { cn } from "@/lib/utils";

export default function CreateApiKeyPage() {
  const router = useRouter();
  const params = useParams();
  const appId = params.appId as string;
  const { t, dir } = useLocale();
  const s = t.dashboard.apiKeys as Record<string, any>;
  const cm = s.createModal as Record<string, string>;
  const cp = s.createPage as Record<string, string>;
  const scopeLabels = s.scopeLabels as Record<string, string>;

  const createMutation = useCreateApiKey();
  const { data: app } = useApp(appId);

  /* ── Form state ── */
  const [name, setName] = useState("");
  const [environment, setEnvironment] = useState<ApiKeyEnvironment>("live");
  const [selectedScopes, setSelectedScopes] = useState<string[]>([
    "whatsapp:send",
    "whatsapp:read",
    "templates:read",
    "contacts:read",
  ]);
  const [ipInput, setIpInput] = useState("");
  const [ipList, setIpList] = useState<string[]>([]);
  const [expiresAt, setExpiresAt] = useState<DateValue | null>(null);
  const [error, setError] = useState<string | null>(null);

  /* ── Success state ── */
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

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

  const handleCopyKey = useCallback(async () => {
    if (!createdKey) return;
    await navigator.clipboard.writeText(createdKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [createdKey]);

  const handleSubmit = useCallback(async () => {
    if (!name.trim() || !app?.id) return;
    setError(null);
    try {
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        developerAppId: app.id,
        scopes: selectedScopes,
        environment,
        ipAllowlist: ipList.length > 0 ? ipList : undefined,
        expiresAt: expiresAt ? expiresAt.toString() : undefined,
      });
      setCreatedKey(result.key);
    } catch (err: any) {
      setError(err?.message || "An error occurred");
    }
  }, [name, app, selectedScopes, environment, ipList, expiresAt, createMutation]);

  /* ================================================================ */
  /*  Success view                                                     */
  /* ================================================================ */
  if (createdKey) {
    const ss = s.successModal as Record<string, string>;
    return (
      <div className="mt-2 sm:mt-10 max-w-2xl mx-auto">
        <div className="flex flex-col items-center text-center py-16 gap-6">
          {/* Icon */}
          <div className="relative">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-success/10 ring-1 ring-success/20">
              <Key className="size-7 text-success" />
            </div>
            <div className="absolute -bottom-1.5 -end-1.5 flex size-7 items-center justify-center rounded-full bg-success text-white ring-2 ring-background">
              <CheckCircle2 className="size-4" />
            </div>
          </div>

          <div>
            <h1 className="text-xl font-bold text-foreground">{cp.successHeading}</h1>
            <p className="text-sm text-muted mt-1.5 max-w-md">{cp.successDesc}</p>
          </div>

          {/* Key display */}
          <div className="w-full max-w-lg">
            <Alert status="warning" className="mb-4">
              <Alert.Indicator />
              <Alert.Content>
                <Alert.Description>{ss.warning}</Alert.Description>
              </Alert.Content>
            </Alert>

            <div className="flex items-center gap-2 rounded-xl bg-default/60 p-3">
              <code className="flex-1 text-xs font-mono text-foreground break-all select-all">
                {createdKey}
              </code>
              <Tooltip>
                <Tooltip.Trigger>
                  <button
                    type="button"
                    onClick={handleCopyKey}
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background hover:bg-default transition-colors"
                  >
                    {copied ? (
                      <Check className="size-4 text-success" />
                    ) : (
                      <Copy className="size-4 text-muted" />
                    )}
                  </button>
                </Tooltip.Trigger>
                <Tooltip.Content>{copied ? ss.copied : ss.copy}</Tooltip.Content>
              </Tooltip>
            </div>
          </div>

          <Button
            variant="primary"
            onPress={() => router.push(`/app/${appId}/api-keys`)}
            className="mt-2 rounded-full px-8"
          >
            {cp.goToKeys}
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
          {cp.back}
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
          {cp.heading}
        </h1>
        <p className="text-sm text-muted mt-1">{cp.description}</p>
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
            <h2 className="text-sm font-semibold text-foreground">{cp.basicsSection}</h2>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background dark:bg-overlay p-5 space-y-5">
            {/* Name */}
            <TextField
              value={name}
              onChange={setName}
              isRequired
              autoFocus
            >
              <Label>{cm.nameLabel}</Label>
              <Input placeholder={cm.namePlaceholder} />
            </TextField>

            <Separator />

            {/* Environment */}
            <RadioGroup
              value={environment}
              onChange={(v) => setEnvironment(v as ApiKeyEnvironment)}
            >
              <Label>{cm.envLabel}</Label>
              <Description>{cm.envDesc}</Description>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                <label
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all",
                    environment === "live"
                      ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                      : "border-border/50 hover:border-border",
                  )}
                >
                  <Radio value="live" className="mt-0.5">
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                  </Radio>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Globe className="size-4 text-success" />
                      <span className="text-sm font-medium text-foreground">{s.live}</span>
                    </div>
                    <p className="text-xs text-muted mt-1">{cp.envLiveDesc}</p>
                  </div>
                </label>

                <label
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition-all",
                    environment === "test"
                      ? "border-accent bg-accent/5 ring-1 ring-accent/20"
                      : "border-border/50 hover:border-border",
                  )}
                >
                  <Radio value="test" className="mt-0.5">
                    <Radio.Control>
                      <Radio.Indicator />
                    </Radio.Control>
                  </Radio>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="size-4 text-warning" />
                      <span className="text-sm font-medium text-foreground">{s.test}</span>
                    </div>
                    <p className="text-xs text-muted mt-1">{cp.envTestDesc}</p>
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>
        </section>

        {/* ─────────────── Section 2: Permissions ─────────────── */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <div className="flex size-7 items-center justify-center rounded-lg bg-accent/10">
              <Shield className="size-3.5 text-accent" />
            </div>
            <h2 className="text-sm font-semibold text-foreground">{cp.permissionsSection}</h2>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background dark:bg-overlay p-5">
            <CheckboxGroup
              value={selectedScopes}
              onChange={setSelectedScopes}
            >
              <Label>{cm.scopesLabel}</Label>
              <Description>{cp.scopesHelp}</Description>
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
            <h2 className="text-sm font-semibold text-foreground">{cp.securitySection}</h2>
          </div>

          <div className="rounded-2xl border border-border/50 bg-background dark:bg-overlay p-5 space-y-5">
            {/* IP Allowlist */}
            <div>
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

            <Separator />

            {/* Expiration */}
            <DatePicker
              value={expiresAt}
              onChange={setExpiresAt}
              minValue={today(getLocalTimeZone())}
            >
              <Label>{cm.expiresLabel}</Label>
              <Description>{cm.expiresDesc}</Description>
              <DateField.Group>
                <DateField.Input>
                  {(segment) => <DateField.Segment segment={segment} />}
                </DateField.Input>
                <DateField.Suffix>
                  <DatePicker.Trigger>
                    <DatePicker.TriggerIndicator />
                  </DatePicker.Trigger>
                </DateField.Suffix>
              </DateField.Group>
              <DatePicker.Popover>
                <Calendar aria-label="Expiration date">
                  <Calendar.Header>
                    <Calendar.Heading />
                    <Calendar.NavButton slot="previous" />
                    <Calendar.NavButton slot="next" />
                  </Calendar.Header>
                  <Calendar.Grid>
                    <Calendar.GridHeader>
                      {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>
                      {(date) => <Calendar.Cell date={date} />}
                    </Calendar.GridBody>
                  </Calendar.Grid>
                </Calendar>
              </DatePicker.Popover>
            </DatePicker>
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
            isDisabled={!name.trim() || createMutation.isPending}
            isPending={createMutation.isPending}
            className="rounded-full px-8"
          >
            {createMutation.isPending ? cp.creating : cp.create}
          </Button>
        </div>
      </div>
    </div>
  );
}

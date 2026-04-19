"use client";

import { useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Modal, AlertDialog, Tooltip, Dropdown, Alert, Label, Select, ListBox, TextField, Input, TextArea, Description, Spinner } from "@heroui/react";
import {
  FileText,
  Plus,
  MoreHorizontal,
  Trash2,
  RefreshCw,
  Circle,
  Clock,
  Languages,
  Tag,
  Megaphone,
  Shield,
  Wrench,
  Building2,
} from "lucide-react";
import { useLocale } from "@/providers/locale-provider";
import { useAuth } from "@/providers/auth-provider";
import {
  useTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useSyncTemplates,
  useWabaAccounts,
} from "@/lib/hooks/use-whatsapp";
import type { WhatsappTemplate, TemplateCategory, TemplateStatus, WabaAccount } from "@/lib/api/whatsapp";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(dateStr));
}

const STATUS_CONFIG: Record<TemplateStatus, { color: string; bg: string; ring: string }> = {
  APPROVED: { color: "text-success", bg: "bg-success/15", ring: "ring-success/20" },
  PENDING: { color: "text-warning", bg: "bg-warning/15", ring: "ring-warning/20" },
  REJECTED: { color: "text-danger", bg: "bg-danger/15", ring: "ring-danger/20" },
  PAUSED: { color: "text-muted", bg: "bg-default/60", ring: "ring-border" },
  DISABLED: { color: "text-muted", bg: "bg-default/60", ring: "ring-border" },
};

const CATEGORY_ICONS: Record<TemplateCategory, typeof Megaphone> = {
  MARKETING: Megaphone,
  AUTHENTICATION: Shield,
  UTILITY: Wrench,
};

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

function PageSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="flex items-center justify-between pb-5">
        <div className="space-y-2.5">
          <div className="h-7 w-48 rounded-lg bg-default/80" />
          <div className="h-4 w-72 rounded-lg bg-default/50" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-32 rounded-full bg-default/60" />
          <div className="h-10 w-36 rounded-full bg-default/80" />
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-border/30 bg-background p-5">
            <div className="flex items-center gap-4">
              <div className="size-11 rounded-xl bg-default/70" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 w-40 rounded-lg bg-default/70" />
                <div className="h-3 w-24 rounded bg-default/40" />
              </div>
              <div className="flex gap-2">
                <div className="h-6 w-18 rounded-full bg-default/50" />
                <div className="h-6 w-20 rounded-full bg-default/50" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Delete Dialog                                                      */
/* ------------------------------------------------------------------ */

function DeleteDialog({
  open,
  onClose,
  onConfirm,
  isPending,
  labels,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  labels: Record<string, string>;
}) {
  return (
    <AlertDialog isOpen={open} onOpenChange={(v: boolean) => !v && onClose()}>
      <AlertDialog.Backdrop>
        <AlertDialog.Container>
          <AlertDialog.Dialog>
            <AlertDialog.Header>
              <AlertDialog.Icon status="danger" />
              <AlertDialog.Heading>{labels.deleteTitle}</AlertDialog.Heading>
            </AlertDialog.Header>
            <AlertDialog.Body>
              <p className="text-sm text-muted">{labels.deleteConfirm}</p>
            </AlertDialog.Body>
            <AlertDialog.Footer>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-default transition-colors"
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={isPending}
                className="rounded-xl bg-danger px-4 py-2.5 text-sm font-medium text-danger-foreground hover:bg-danger/90 transition-colors disabled:opacity-50"
              >
                {isPending ? "..." : labels.delete}
              </button>
            </AlertDialog.Footer>
          </AlertDialog.Dialog>
        </AlertDialog.Container>
      </AlertDialog.Backdrop>
    </AlertDialog>
  );
}

/* ------------------------------------------------------------------ */
/*  Create Template Dialog                                             */
/* ------------------------------------------------------------------ */

function CreateTemplateDialog({
  open,
  onClose,
  appId,
  labels,
  accounts,
}: {
  open: boolean;
  onClose: () => void;
  appId: string;
  labels: Record<string, string>;
  accounts?: WabaAccount[];
}) {
  const [name, setName] = useState("");
  const [language, setLanguage] = useState<string>("ar");
  const [category, setCategory] = useState<string>("UTILITY");
  const [bodyText, setBodyText] = useState("");
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const createMutation = useCreateTemplate(appId);

  const handleCreate = useCallback(async () => {
    if (!name.trim() || !bodyText.trim()) return;
    await createMutation.mutateAsync({
      name: name.trim().toLowerCase().replace(/\s+/g, "_"),
      language: language || "ar",
      category: (category || "UTILITY") as TemplateCategory,
      components: [{ type: "BODY", text: bodyText.trim() }],
      accountId: selectedAccountId || undefined,
    });
    setName("");
    setLanguage("ar");
    setCategory("UTILITY");
    setBodyText("");
    setSelectedAccountId(null);
    onClose();
  }, [name, language, category, bodyText, selectedAccountId, createMutation, onClose]);

  const handleCloseClean = useCallback(() => {
    setName("");
    setBodyText("");
    setSelectedAccountId(null);
    onClose();
  }, [onClose]);

  const LANGUAGES = [
    { id: "ar", label: "العربية (ar)" },
    { id: "en", label: "English (en)" },
    { id: "en_US", label: "English US (en_US)" },
    { id: "ar_SA", label: "العربية SA (ar_SA)" },
    { id: "ar_IQ", label: "العربية IQ (ar_IQ)" },
  ];

  const CATEGORIES = [
    { id: "UTILITY", label: labels.utility, icon: Wrench },
    { id: "MARKETING", label: labels.marketing, icon: Megaphone },
    { id: "AUTHENTICATION", label: labels.authentication, icon: Shield },
  ];

  return (
    <Modal isOpen={open} onOpenChange={(v: boolean) => !v && handleCloseClean()}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className="sm:max-w-lg">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Icon>
                <FileText className="size-5 text-[#25D366]" />
              </Modal.Icon>
              <Modal.Heading>{labels.createTitle}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <div className="space-y-4">
                {/* WABA Account selector */}
                {accounts && accounts.length > 1 && (
                  <Select
                    selectedKey={selectedAccountId}
                    onSelectionChange={(key) => setSelectedAccountId(key as string)}
                    className="w-full"
                    placeholder={labels.autoSelect ?? "Auto select"}
                  >
                    <Label className="text-xs font-medium text-foreground">{labels.account ?? "WhatsApp Account"}</Label>
                    <Select.Trigger className="rounded-xl">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {accounts.map((acc) => (
                          <ListBox.Item key={acc.id} id={acc.id} textValue={`${acc.businessName} (${acc.wabaId})`}>
                            <div className="flex items-center gap-2">
                              <Building2 className="size-4 text-muted shrink-0" />
                              <div className="min-w-0">
                                <Label className="text-sm">{acc.businessName}</Label>
                                <Description className="text-xs font-mono">{acc.wabaId}</Description>
                              </div>
                            </div>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                )}

                {/* Name */}
                <TextField className="w-full">
                  <Label className="text-xs font-medium text-foreground">{labels.name}</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={labels.namePlaceholder}
                    className="rounded-xl font-mono"
                  />
                </TextField>

                {/* Language + Category row */}
                <div className="grid grid-cols-2 gap-3">
                  <Select
                    selectedKey={language}
                    onSelectionChange={(key) => setLanguage(key as string)}
                  >
                    <Label className="text-xs font-medium text-foreground">{labels.language}</Label>
                    <Select.Trigger className="rounded-xl">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {LANGUAGES.map((lang) => (
                          <ListBox.Item key={lang.id} id={lang.id} textValue={lang.label}>
                            <Label>{lang.label}</Label>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>

                  <Select
                    selectedKey={category}
                    onSelectionChange={(key) => setCategory(key as string)}
                  >
                    <Label className="text-xs font-medium text-foreground">{labels.category}</Label>
                    <Select.Trigger className="rounded-xl">
                      <Select.Value />
                      <Select.Indicator />
                    </Select.Trigger>
                    <Select.Popover>
                      <ListBox>
                        {CATEGORIES.map((cat) => (
                          <ListBox.Item key={cat.id} id={cat.id} textValue={cat.label}>
                            <div className="flex items-center gap-2">
                              <cat.icon className="size-3.5 text-muted" />
                              <Label>{cat.label}</Label>
                            </div>
                          </ListBox.Item>
                        ))}
                      </ListBox>
                    </Select.Popover>
                  </Select>
                </div>

                {/* Body */}
                <TextField className="w-full">
                  <Label className="text-xs font-medium text-foreground">{labels.bodyLabel}</Label>
                  <TextArea
                    value={bodyText}
                    onChange={(e) => setBodyText(e.target.value)}
                    placeholder={labels.bodyPlaceholder}
                    rows={4}
                    className="rounded-xl resize-none"
                  />
                </TextField>
              </div>
            </Modal.Body>
            <Modal.Footer>
              <button
                type="button"
                onClick={handleCloseClean}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-default transition-colors"
              >
                {labels.cancel}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                disabled={!name.trim() || !bodyText.trim() || createMutation.isPending}
                className="flex items-center gap-2 rounded-xl bg-[#25D366] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#25D366]/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending && <Spinner className="size-3.5" />}
                {createMutation.isPending ? labels.creating : labels.create}
              </button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/*  Template Row                                                       */
/* ------------------------------------------------------------------ */

function TemplateRow({
  template,
  labels,
  onDelete,
}: {
  template: WhatsappTemplate;
  labels: Record<string, string>;
  onDelete: (template: WhatsappTemplate) => void;
}) {
  const sc = STATUS_CONFIG[template.status] ?? STATUS_CONFIG.PENDING;
  const CatIcon = CATEGORY_ICONS[template.category] ?? Wrench;

  const statusLabel =
    template.status === "APPROVED" ? labels.approved
    : template.status === "PENDING" ? labels.pending
    : template.status === "REJECTED" ? labels.rejected
    : template.status === "PAUSED" ? labels.paused
    : labels.disabled;

  const categoryLabel =
    template.category === "MARKETING" ? labels.marketing
    : template.category === "AUTHENTICATION" ? labels.authentication
    : labels.utility;

  const bodyComponent = template.components?.find((c: any) => c.type === "BODY");
  const bodyText = bodyComponent?.text ?? "";

  return (
    <div className="group rounded-2xl border border-border bg-background shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className={cn(
              "flex size-11 shrink-0 items-center justify-center rounded-xl ring-1",
              template.status === "APPROVED" ? "bg-success/10 ring-success/20 text-success"
              : template.status === "REJECTED" ? "bg-danger/10 ring-danger/20 text-danger"
              : "bg-[#25D366]/10 ring-[#25D366]/20 text-[#25D366]",
            )}>
              <CatIcon className="size-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground truncate font-mono">{template.name}</h3>
              </div>
              {bodyText && (
                <p className="text-xs text-muted/70 mt-0.5 line-clamp-1">{bodyText}</p>
              )}
            </div>
          </div>

          {/* Right badges + actions */}
          <div className="flex items-center gap-2 shrink-0">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1",
              sc.bg, sc.color, sc.ring,
            )}>
              <Circle className="size-1.5 fill-current" />
              {statusLabel}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/8 px-2.5 py-0.5 text-[11px] font-medium text-accent/80 ring-1 ring-accent/10">
              <Tag className="size-3" />
              {categoryLabel}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-default/50 px-2.5 py-0.5 text-[11px] text-muted ring-1 ring-border/50">
              <Languages className="size-3" />
              {template.language}
            </span>

            <Dropdown>
              <Dropdown.Trigger>
                <div
                  role="button"
                  tabIndex={0}
                  className="flex size-8 items-center justify-center rounded-lg text-muted hover:bg-default hover:text-foreground transition-colors cursor-pointer"
                >
                  <MoreHorizontal className="size-4" />
                </div>
              </Dropdown.Trigger>
              <Dropdown.Popover placement="bottom end" className="min-w-[140px] rounded-xl">
                <Dropdown.Menu onAction={(key) => {
                  if (key === 'delete') onDelete(template);
                }}>
                  <Dropdown.Item id="delete" textValue={labels.delete} variant="danger">
                    <Trash2 className="size-4" />
                    <Label>{labels.delete}</Label>
                  </Dropdown.Item>
                </Dropdown.Menu>
              </Dropdown.Popover>
            </Dropdown>
          </div>
        </div>

        {/* Rejected reason */}
        {template.status === "REJECTED" && template.rejectedReason && (
          <Alert status="danger" className="mt-3">
            <Alert.Indicator />
            <Alert.Content>
              <Alert.Description className="text-xs">{template.rejectedReason}</Alert.Description>
            </Alert.Content>
          </Alert>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border/30 bg-default/20 px-5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] text-muted font-medium">
          <Clock className="size-3" />
          {formatDate(template.createdAt)}
        </div>
        {template.account && (
          <div className="flex items-center gap-1.5 text-[11px] text-muted font-medium">
            <Building2 className="size-3" />
            <span>{template.account.businessName}</span>
            <span className="font-mono opacity-60">({template.account.wabaId})</span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyState({ labels, onCreate }: { labels: Record<string, string>; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
      <div className="relative">
        <div className="flex size-16 items-center justify-center rounded-2xl bg-[#25D366]/10 ring-1 ring-[#25D366]/20">
          <FileText className="size-7 text-[#25D366]" />
        </div>
        <div className="absolute -bottom-1.5 -end-1.5 flex size-7 items-center justify-center rounded-full bg-[#25D366] text-white ring-2 ring-background">
          <Plus className="size-3.5" />
        </div>
      </div>
      <div>
        <p className="text-base font-semibold text-foreground">{labels.noTemplates}</p>
        <p className="text-sm text-muted mt-1.5 max-w-sm leading-relaxed">{labels.noTemplatesDesc}</p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        className="flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#25D366]/90 shadow-sm shadow-[#25D366]/20 transition-all hover:shadow-md hover:shadow-[#25D366]/20"
      >
        <Plus className="size-4" />
        {labels.create}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function TemplatesPage() {
  const { isLoading: authLoading } = useAuth();
  const { t } = useLocale();
  const params = useParams();
  const appId = params.appId as string;

  const raw = (t as any).whatsapp?.templates as Record<string, string> | undefined;
  const s = {
    title: raw?.title ?? "Message Templates",
    subtitle: raw?.subtitle ?? "Create and manage your WhatsApp message templates",
    create: raw?.create ?? "Create Template",
    sync: raw?.sync ?? "Sync with Meta",
    syncing: raw?.syncing ?? "Syncing...",
    noTemplates: raw?.noTemplates ?? "No templates yet",
    noTemplatesDesc: raw?.noTemplatesDesc ?? "Create message templates to send structured messages to your customers.",
    name: raw?.name ?? "Template Name",
    language: raw?.language ?? "Language",
    category: raw?.category ?? "Category",
    status: raw?.status ?? "Status",
    created: raw?.created ?? "Created",
    delete: raw?.delete ?? "Delete",
    deleteTitle: raw?.deleteTitle ?? "Delete Template",
    deleteConfirm: raw?.deleteConfirm ?? "Are you sure you want to delete this template?",
    cancel: raw?.cancel ?? "Cancel",
    approved: raw?.approved ?? "Approved",
    pending: raw?.pending ?? "Pending",
    rejected: raw?.rejected ?? "Rejected",
    paused: raw?.paused ?? "Paused",
    disabled: raw?.disabled ?? "Disabled",
    authentication: raw?.authentication ?? "Authentication",
    marketing: raw?.marketing ?? "Marketing",
    utility: raw?.utility ?? "Utility",
    createTitle: raw?.createTitle ?? "Create Template",
    namePlaceholder: raw?.namePlaceholder ?? "e.g. order_confirmation",
    bodyLabel: raw?.bodyLabel ?? "Body Text",
    bodyPlaceholder: raw?.bodyPlaceholder ?? "Enter the message body text...",
    creating: raw?.creating ?? "Creating...",
  };

  const [deleteTarget, setDeleteTarget] = useState<WhatsappTemplate | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [syncAccountId, setSyncAccountId] = useState<string>("");

  const { data: templates, isLoading: templatesLoading } = useTemplates(appId, syncAccountId || undefined);
  const { data: accounts } = useWabaAccounts(appId);
  const deleteMutation = useDeleteTemplate(appId);
  const syncMutation = useSyncTemplates(appId);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.name);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation]);

  if (authLoading || templatesLoading) {
    return (
      <div className="mt-2 sm:mt-10">
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className="mt-2 sm:mt-10">
      {/* ── Header ── */}
      <div className="pb-4 pt-2 border-b border-border/20 -mx-3 px-3 sm:-mx-4 sm:px-4 md:-mx-6 md:px-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-[#25D366]/10">
              <FileText className="size-4 text-[#25D366]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">{s.title}</h1>
              <p className="text-sm text-muted mt-0.5">{s.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {accounts && accounts.length > 1 && (
              <Select
                selectedKey={syncAccountId || null}
                onSelectionChange={(key) => {
                  setSyncAccountId((key as string) || "");
                }}
                className="min-w-[180px]"
                placeholder={"All Accounts"}
              >
                <Select.Trigger className="h-10 rounded-full text-xs">
                  <Select.Value />
                  <Select.Indicator />
                </Select.Trigger>
                <Select.Popover>
                  <ListBox>
                    {accounts.map((acc) => (
                      <ListBox.Item key={acc.id} id={acc.id} textValue={`${acc.businessName} (${acc.wabaId})`}>
                        <div className="flex items-center gap-2">
                          <Building2 className="size-3.5 text-muted shrink-0" />
                          <div className="min-w-0">
                            <Label className="text-xs">{acc.businessName}</Label>
                            <Description className="text-[10px] font-mono text-muted">{acc.wabaId}</Description>
                          </div>
                        </div>
                      </ListBox.Item>
                    ))}
                  </ListBox>
                </Select.Popover>
              </Select>
            )}
            <button
              type="button"
              onClick={() => syncMutation.mutate(syncAccountId || undefined)}
              disabled={syncMutation.isPending}
              className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-default transition-colors disabled:opacity-50 shrink-0"
            >
              <RefreshCw className={cn("size-3.5", syncMutation.isPending && "animate-spin")} />
              {syncMutation.isPending ? s.syncing : s.sync}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-[#25D366]/25 hover:bg-[#25D366]/90 hover:shadow-md hover:shadow-[#25D366]/25 transition-all shrink-0"
            >
              <Plus className="size-4" />
              {s.create}
            </button>
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      {!templates?.length ? (
        <EmptyState labels={s} onCreate={() => setShowCreate(true)} />
      ) : (
        <div className="space-y-3 mt-6">
          {templates.map((tpl) => (
            <TemplateRow
              key={tpl.id}
              template={tpl}
              labels={s}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      {/* ── Dialogs ── */}
      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        isPending={deleteMutation.isPending}
        labels={s}
      />
      <CreateTemplateDialog
        open={showCreate}
        onClose={() => setShowCreate(false)}
        appId={appId}
        labels={s}
        accounts={accounts}
      />
    </div>
  );
}

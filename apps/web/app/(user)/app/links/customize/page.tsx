'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Paintbrush,
  ExternalLink,
  Loader2,
  Eye,
  Sparkles,
  Layout,
  Briefcase,
  ShoppingBag,
  Type,
  FileText,
  MousePointerClick,
  Upload,
  Image as ImageIcon,
  Plus,
  Trash2,
  ToggleRight,
  ToggleLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PROFILE_TEMPLATES, getTemplate, type TemplateKey } from '@/lib/profile-templates';
import { getMyProfile } from '@/actions/settings';
import { updateProfile, uploadLogo, deleteLogo } from '@/actions/settings';
import { useAuth } from '@/providers';

/* ------------------------------------------------------------------ */
/*  Template Icon Map                                                   */
/* ------------------------------------------------------------------ */
const TEMPLATE_ICONS: Record<TemplateKey, React.FC<{ className?: string }>> = {
  classic: Layout,
  portfolio: Briefcase,
  store: ShoppingBag
};

/* ------------------------------------------------------------------ */
/*  Mini Phone Preview                                                  */
/* ------------------------------------------------------------------ */
interface MiniPreviewProps {
  templateKey: TemplateKey;
  profile: {
    name?: string;
    username?: string;
    avatar?: string;
    bio?: string;
    coverImage?: string;
    location?: string;
  } | null;
}

/* Classic template mini preview — uses static screenshot */
function ClassicPreview({ profile: _ }: { profile: MiniPreviewProps['profile'] }) {
  return (
    <div className="w-full h-full overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/Photo/classic%20.png"
        alt="Classic template preview"
        className="w-full h-full object-cover object-top"
      />
    </div>
  );
}

function MiniPreview({ templateKey, profile }: MiniPreviewProps) {
  return (
    <div className="w-full h-full overflow-hidden rounded-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={templateKey}
          className="w-full h-full"
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.2 }}
        >
          {templateKey === 'classic' && <ClassicPreview profile={profile} />}
          {templateKey === 'store' && (
            <div className="w-full h-full bg-[#fafaf8] flex flex-col overflow-hidden">
              <div className="h-5 bg-white border-b border-[#f0ede8] flex items-center px-2">
                <div className="w-3 h-3 rounded-full bg-[#1D1D1F]" />
                <div className="mx-auto h-1.5 w-10 rounded bg-[#e0ddd8]" />
                <ShoppingBag className="w-2.5 h-2.5 text-[#1D1D1F]" />
              </div>
              <div className="flex gap-1 px-2 py-1.5">
                {['الكل', 'ملابس', 'أحذية'].map((c, i) => (
                  <span key={c} className={cn('text-[5px] px-1.5 py-0.5 rounded-full', i === 0 ? 'bg-[#1D1D1F] text-white' : 'bg-white text-[#999] border border-[#e0ddd8]')}>{c}</span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5 px-2 flex-1">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex flex-col">
                    <div className="aspect-square rounded-md bg-[#ebe8e4]" />
                    <div className="h-1 w-8 bg-[#d4cdc2] rounded mt-1" />
                    <div className="h-1.5 w-5 bg-[#1D1D1F] rounded mt-0.5" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                    */
/* ------------------------------------------------------------------ */
function CustomizeSkeleton() {
  return (
    <div className="space-y-6 mt-10">
      {/* Header skeleton */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-muted/40 animate-pulse shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-40 bg-muted/40 rounded-lg animate-pulse" />
          <div className="h-4 w-64 bg-muted/30 rounded-lg animate-pulse" />
        </div>
      </div>
      {/* Template cards skeleton */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl bg-muted/40 h-[220px] sm:h-[280px] animate-pulse" />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                           */
/* ------------------------------------------------------------------ */
export default function CustomizePage() {
  const { user } = useAuth();
  const [selectedKey, setSelectedKey] = useState<TemplateKey>('classic');
  const [activeKey, setActiveKey] = useState<TemplateKey>('classic');
  const [profile, setProfile] = useState<{
    name?: string;
    username?: string;
    avatar?: string;
    bio?: string;
    coverImage?: string;
    location?: string;
  } | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Hero settings state
  const [heroHeadline, setHeroHeadline] = useState('');
  const [heroDescription, setHeroDescription] = useState('');
  const [heroButtons, setHeroButtons] = useState<Array<{ label: string; url: string; variant: 'dark' | 'outline' }>>([]);
  const [savingHero, setSavingHero] = useState(false);
  const [savedHero, setSavedHero] = useState(false);
  const [heroDialogOpen, setHeroDialogOpen] = useState(false);

  // Logo cloud state
  const [logoCloudEnabled, setLogoCloudEnabled] = useState(false);
  const [logos, setLogos] = useState<Array<{ id: string; src: string; key: string; alt: string; displayOrder: number }>>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  /* Fetch current profile + themeKey */
  useEffect(() => {
    async function load() {
      setLoadingProfile(true);
      const { data } = await getMyProfile();
      if (data) {
        setProfile({
          name: data.name,
          username: data.username,
          avatar: data.avatar ?? undefined,
          bio: data.bio ?? undefined,
          coverImage: data.coverImage ?? undefined,
          location: (data as any).location ?? undefined,
        });
        const theme = ((data as any).themeKey as TemplateKey) ?? 'classic';
        setSelectedKey(theme);
        setActiveKey(theme);
        // Load hero settings
        const hero = (data as any).heroSettings;
        if (hero) {
          setHeroHeadline(hero.headline || '');
          setHeroDescription(hero.description || '');
          setHeroButtons(hero.buttons || []);
          if (hero.logoCloud) {
            setLogoCloudEnabled(hero.logoCloud.enabled ?? false);
            setLogos((hero.logoCloud.logos || []).map((l: any, idx: number) => ({
              id: l.id || crypto.randomUUID(),
              src: l.src,
              key: l.key || l.src,
              alt: l.alt || '',
              displayOrder: l.displayOrder ?? idx,
            })));
          }
        }
      }
      setLoadingProfile(false);
    }
    load();
  }, []);

  const hasChanges = selectedKey !== activeKey;

  async function handleApply() {
    if (!hasChanges) return;
    setSaving(true);
    const { error } = await updateProfile({ themeKey: selectedKey });
    setSaving(false);
    if (!error) {
      setActiveKey(selectedKey);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    }
  }

  async function handleSaveHero() {
    setSavingHero(true);
    const { error } = await updateProfile({
      heroSettings: {
        headline: heroHeadline || undefined,
        description: heroDescription || undefined,
        buttons: heroButtons.length > 0 ? heroButtons : undefined,
        logoCloud: {
          enabled: logoCloudEnabled,
          logos: logos.map((l, i) => ({
            id: l.id,
            src: l.key,
            alt: l.alt,
            displayOrder: i,
          })),
        },
      },
    });
    setSavingHero(false);
    if (!error) {
      setSavedHero(true);
      setTimeout(() => setSavedHero(false), 2500);
    }
  }

  async function handleUploadLogo() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/png,image/jpeg,image/webp,image/gif,image/svg+xml';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > 500 * 1024) {
        alert('حجم الشعار يتجاوز 500KB');
        return;
      }
      if (logos.length >= 10) {
        alert('الحد الأقصى 10 شعارات');
        return;
      }
      setUploadingLogo(true);
      const formData = new FormData();
      formData.append('file', file);
      const { data, error } = await uploadLogo(formData);
      setUploadingLogo(false);
      if (data && !error) {
        const newLogo = {
          id: crypto.randomUUID(),
          src: data.url,
          key: data.key,
          alt: file.name.replace(/\.[^.]+$/, ''),
          displayOrder: logos.length,
        };
        setLogos((prev) => [...prev, newLogo]);
      }
    };
    input.click();
  }

  async function handleDeleteLogo(index: number) {
    const logo = logos[index];
    if (!logo) return;
    const { error } = await deleteLogo(logo.key);
    if (!error) {
      setLogos((prev) => prev.filter((_, i) => i !== index));
    }
  }

  function addHeroButton() {
    if (heroButtons.length >= 2) return;
    setHeroButtons([...heroButtons, { label: '', url: '', variant: heroButtons.length === 0 ? 'dark' : 'outline' }]);
  }

  function removeHeroButton(index: number) {
    setHeroButtons(heroButtons.filter((_, i) => i !== index));
  }

  function updateHeroButton(index: number, field: string, value: string) {
    setHeroButtons(heroButtons.map((btn, i) => i === index ? { ...btn, [field]: value } : btn));
  }

  const selectedTemplate = getTemplate(selectedKey);

  if (loadingProfile) return <CustomizeSkeleton />;

  return (
    <div className="space-y-6 mt-10 pb-20 md:pb-6">
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Paintbrush className="w-4 h-4 sm:w-[18px] sm:h-[18px] text-primary" />
          </div>
          <div className="space-y-0.5">
            <h1 className="text-sm sm:text-lg font-bold text-foreground">
              تخصيص الملف الشخصي
            </h1>
            <p className="text-[11px] sm:text-sm text-muted-foreground">
              اختر قالباً لتغيير شكل صفحتك العامة
            </p>
          </div>
        </div>
        {profile?.username && (
          <a
            href={`/${profile.username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Eye className="w-4 h-4" />
            <span className="hidden sm:inline">معاينة الصفحة</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* ─── Active Template Bar ─── */}
      <div className="flex items-center justify-between rounded-2xl bg-card border border-border/60 px-3 sm:px-4 py-2.5 sm:py-3">
        <p className="text-sm text-muted-foreground">
          القالب الحالي:&nbsp;
          <span className="font-semibold text-foreground">{getTemplate(activeKey).name}</span>
        </p>
        {hasChanges && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">تغييرات غير محفوظة</span>
          </motion.div>
        )}
      </div>

      {/* ─── Templates Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {PROFILE_TEMPLATES.map((template) => {
          const Icon = TEMPLATE_ICONS[template.key];
          const isSelected = selectedKey === template.key;
          const isActive = activeKey === template.key;

          return (
            <motion.button
              key={template.key}
              type="button"
              onClick={() => setSelectedKey(template.key)}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                'relative flex flex-col text-right rounded-2xl transition-all duration-200 overflow-hidden group border',
                isSelected
                  ? 'ring-1 ring-primary shadow-lg shadow-primary/10 bg-card border-primary/20'
                  : 'bg-card border-border/60 hover:border-border hover:shadow-md',
              )}
            >
              {/* Active indicator */}
              {isActive && (
                <div className="absolute m-2 top-3 right-3 z-20">
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 backdrop-blur-sm">
                    <Check className="w-2.5 h-2.5" />
                    مفعّل
                  </span>
                </div>
              )}

              {/* Selected check */}
              {isSelected && !isActive && (
                <div className="absolute  m-2 top-3 right-3 z-20">
                  <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-sm">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                </div>
              )}

              {/* Template Badge */}
              {template.badge && (
                <div className="absolute top-3 left-3 z-20">
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5 font-medium backdrop-blur-sm">
                    {template.badge}
                  </Badge>
                </div>
              )}

              {/* Mini preview area */}
              <div className="relative overflow-hidden rounded-xl m-2 h-[140px] sm:h-[180px]">
                <MiniPreview templateKey={template.key} profile={profile} />
                <div className={cn(
                  'absolute inset-0 transition-colors duration-200',
                  !isSelected && 'group-hover:bg-primary/[0.03]',
                )} />
              </div>

              {/* Template Info */}
              <div className="p-4 text-right space-y-1.5 border-t border-border/30">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-7 h-7 rounded-lg flex items-center justify-center transition-colors shrink-0',
                    isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground group-hover:bg-primary/5 group-hover:text-primary/80',
                  )}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <h3 className={cn(
                    'font-bold text-sm transition-colors',
                    isSelected ? 'text-primary' : 'text-foreground',
                  )}>
                    {template.name}
                  </h3>
                </div>
                <p className="text-[12px] text-muted-foreground leading-relaxed line-clamp-2">
                  {template.description}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* ─── Template Details + Features ─── */}
      <motion.div
        key={selectedKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5 space-y-4"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            {(() => {
              const Icon = TEMPLATE_ICONS[selectedTemplate.key];
              return <Icon className="w-4.5 h-4.5 text-primary" />;
            })()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-foreground">{selectedTemplate.name}</h3>
              {selectedTemplate.badge && (
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{selectedTemplate.badge}</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
              {selectedTemplate.description}
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
          {selectedTemplate.features.map((feat) => (
            <div key={feat} className="flex items-center gap-2 text-[11px] sm:text-[12px] text-foreground">
              <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
              {feat}
            </div>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/30">
          <Button
            onClick={handleApply}
            disabled={!hasChanges || saving}
            size="sm"
            className="gap-2 flex-1 sm:flex-none"
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : saved ? (
              <Check className="w-4 h-4" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            {saved ? 'تم التطبيق!' : hasChanges ? 'تطبيق القالب' : 'القالب الحالي'}
          </Button>

          {hasChanges && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedKey(activeKey)}
              disabled={saving}
              className="text-muted-foreground hover:text-foreground"
            >
              إلغاء
            </Button>
          )}
        </div>
      </motion.div>

      {/* ─── Hero Section Settings (for portfolio template) ─── */}
      {(activeKey === 'portfolio' || selectedKey === 'portfolio') && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <button
            onClick={() => setHeroDialogOpen(true)}
            className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/60 p-4 sm:p-5 hover:bg-accent transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
              <Type className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-right min-w-0">
              <h3 className="font-bold text-sm text-foreground">تخصيص القالب</h3>
              <p className="text-xs text-muted-foreground mt-0.5">العنوان والوصف والأزرار وشريط الشعارات</p>
            </div>
            <Paintbrush className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </button>
        </motion.div>
      )}

      {/* ─── Store Pro Customization (banner slider + cover) ─── */}
      {(activeKey === 'store' || selectedKey === 'store') && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          <a
            href="/app/settings/store"
            className="w-full flex items-center gap-3 rounded-2xl bg-card border border-border/60 p-4 sm:p-5 hover:bg-accent transition-all group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 group-hover:from-primary/20 group-hover:to-primary/10 transition-colors">
              <ShoppingBag className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 text-right min-w-0">
              <h3 className="font-bold text-sm text-foreground">تخصيص المتجر</h3>
              <p className="text-xs text-muted-foreground mt-0.5">سلايدر الإعلانات وصورة الخلفية وإعدادات المتجر</p>
            </div>
            <Paintbrush className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
          </a>
        </motion.div>
      )}

      {/* ─── Hero Settings Dialog ─── */}
      <Dialog open={heroDialogOpen} onOpenChange={setHeroDialogOpen}>
        <DialogContent className="sm:max-w-[480px] p-0 gap-0 overflow-hidden max-h-[90dvh] flex flex-col" dir="rtl">
          <DialogHeader className="px-5 sm:px-6 pt-5 sm:pt-6 pb-4 border-b border-border/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Type className="w-5 h-5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">تخصيص القالب</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  العنوان الرئيسي والوصف وأزرار الإجراء
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-5 sm:px-6 py-5 space-y-5 overflow-y-auto min-h-0">
            {/* Headline */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                العنوان الرئيسي
              </label>
              <input
                type="text"
                value={heroHeadline}
                onChange={(e) => setHeroHeadline(e.target.value)}
                placeholder="مثال: شريكك الاستراتيجي للحلول الرقمية"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                maxLength={100}
                dir="rtl"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                الوصف
              </label>
              <textarea
                value={heroDescription}
                onChange={(e) => setHeroDescription(e.target.value)}
                placeholder="مثال: أساعد الشركات والعلامات التجارية في بناء تجارب رقمية مميزة"
                className="w-full rounded-xl border border-border/60 bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all resize-none"
                rows={3}
                maxLength={300}
                dir="rtl"
              />
            </div>

            {/* Buttons */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground" />
                  الأزرار
                  <span className="text-[11px] text-muted-foreground font-normal">(بحد أقصى 2)</span>
                </label>
                {heroButtons.length < 2 && (
                  <button
                    onClick={addHeroButton}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    إضافة زر
                  </button>
                )}
              </div>

              {heroButtons.map((btn, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col gap-2 p-3 rounded-xl border border-border/60 bg-card"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      زر {i + 1} — {btn.variant === 'dark' ? 'أساسي' : 'ثانوي'}
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={btn.variant}
                        onChange={(e) => updateHeroButton(i, 'variant', e.target.value)}
                        className="text-xs rounded-lg border border-border/60 bg-background px-2 py-1 focus:outline-none"
                      >
                        <option value="dark">أساسي (داكن)</option>
                        <option value="outline">ثانوي (محدد)</option>
                      </select>
                      <button
                        onClick={() => removeHeroButton(i)}
                        className="p-1 text-destructive/60 hover:text-destructive transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={btn.label}
                    onChange={(e) => updateHeroButton(i, 'label', e.target.value)}
                    placeholder="عنوان الزر"
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    dir="rtl"
                    maxLength={30}
                  />
                  <input
                    type="url"
                    value={btn.url}
                    onChange={(e) => updateHeroButton(i, 'url', e.target.value)}
                    placeholder="الرابط (مثال: https://example.com)"
                    className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
                    dir="ltr"
                  />
                </motion.div>
              ))}

              {heroButtons.length === 0 && (
                <div className="text-center py-4 rounded-xl border border-dashed border-border/60">
                  <MousePointerClick className="w-5 h-5 text-muted-foreground/50 mx-auto mb-1.5" />
                  <p className="text-xs text-muted-foreground">
                    لم تتم إضافة أي أزرار بعد
                  </p>
                </div>
              )}
            </div>

            {/* Logo Cloud Section */}
            <div className="space-y-3 pt-2 border-t border-border/30">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  شريط الشعارات
                </label>
                <button
                  type="button"
                  onClick={() => setLogoCloudEnabled(!logoCloudEnabled)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  {logoCloudEnabled ? (
                    <ToggleRight className="w-7 h-7 text-primary" />
                  ) : (
                    <ToggleLeft className="w-7 h-7" />
                  )}
                </button>
              </div>

              {logoCloudEnabled && (
                <div className="space-y-3">
                  {/* Upload button */}
                  <button
                    type="button"
                    onClick={handleUploadLogo}
                    disabled={uploadingLogo || logos.length >= 10}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/40 hover:bg-primary/5 text-sm text-muted-foreground hover:text-primary transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {uploadingLogo ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploadingLogo ? 'جاري الرفع...' : 'رفع شعار'}
                    <span className="text-[11px] text-muted-foreground/60">({logos.length}/10)</span>
                  </button>

                  {/* Logo grid */}
                  {logos.length > 0 && (
                    <div className="grid grid-cols-5 gap-2">
                      {logos.map((logo, i) => (
                        <div
                          key={logo.id || `logo-${i}`}
                          className="group relative aspect-square rounded-xl border border-border/60 bg-card flex items-center justify-center p-2 overflow-hidden"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={logo.src}
                            alt={logo.alt}
                            className="max-w-full max-h-full object-contain"
                          />
                          <button
                            type="button"
                            onClick={() => handleDeleteLogo(i)}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded-xl"
                          >
                            <Trash2 className="w-4 h-4 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {logos.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-2">
                      لم تتم إضافة شعارات بعد — ارفع شعارات العملاء أو الشركاء
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 sm:px-6 py-4 border-t border-border/50 flex items-center gap-3 shrink-0">
            <Button
              onClick={async () => {
                await handleSaveHero();
                if (!savingHero) setHeroDialogOpen(false);
              }}
              disabled={savingHero}
              className="flex-1 gap-2"
            >
              {savingHero ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : savedHero ? (
                <Check className="w-4 h-4" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {savedHero ? 'تم الحفظ!' : 'حفظ التغييرات'}
            </Button>
            <Button
              variant="outline"
              onClick={() => setHeroDialogOpen(false)}
              disabled={savingHero}
            >
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trash2,
  Eye,
  EyeOff,
  ExternalLink,
  Mail,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers';
import { useToast } from '@/components/ui/toast';
import {
  getLinkedInBlocks,
  getLinkedInStatus,
  toggleLinkedInBlock,
  deleteLinkedInBlock,
  type LinkedInBlock,
  type LinkedInConnection,
} from '@/lib/api/linkedin';

/* ------------------------------------------------------------------ */
/*  LinkedIn Block Card                                                */
/* ------------------------------------------------------------------ */

function LinkedInBlockCard({
  block,
  connection,
  onDelete,
  onToggle,
}: {
  block: LinkedInBlock;
  connection: LinkedInConnection | null;
  onDelete: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn(
        'rounded-2xl border overflow-hidden transition-all',
        block.isActive
          ? 'border-border bg-card'
          : 'border-border/50 bg-muted/30 opacity-70',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/linkedin.svg" alt="LinkedIn" className="w-6 h-6" />
          <div>
            <p className="text-sm font-semibold">بطاقة لينكدإن</p>
            <p className="text-[10px] text-muted-foreground">الملف الشخصي</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onToggle(block.id)}
            className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title={block.isActive ? 'إخفاء' : 'إظهار'}
          >
            {block.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
          <button
            onClick={() => onDelete(block.id)}
            className="p-2 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
            title="حذف"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Profile Card Preview */}
      <div className="p-2.5 sm:p-3">
        {connection ? (
          <a
            href={connection.profileUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl border border-border/60 overflow-hidden hover:shadow-md transition-all group"
          >
            {/* LinkedIn-style banner */}
            <div className="h-16 bg-gradient-to-l from-[#0A66C2] to-[#004182] relative">
              <div className="absolute -bottom-6 right-4">
                {connection.profilePicUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={connection.profilePicUrl}
                    alt={connection.name}
                    className="w-14 h-14 rounded-full object-cover border-[3px] border-card shadow-sm"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-full bg-card border-[3px] border-card shadow-sm flex items-center justify-center">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/icons/linkedin.svg" alt="LinkedIn" className="w-6 h-6 opacity-50" />
                  </div>
                )}
              </div>
            </div>
            {/* Profile info */}
            <div className="pt-8 pb-3 px-4">
              <p className="font-bold text-sm text-foreground group-hover:text-[#0A66C2] transition-colors">
                {connection.name}
              </p>
              {connection.email && (
                <p className="text-xs text-muted-foreground mt-0.5 truncate" dir="ltr">
                  {connection.email}
                </p>
              )}
              {connection.profileUrl && (
                <div className="flex items-center gap-1.5 mt-2.5">
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#0A66C2] group-hover:underline">
                    عرض الملف الشخصي
                    <ExternalLink className="w-3 h-3" />
                  </span>
                </div>
              )}
            </div>
          </a>
        ) : (
          <div className="text-center py-6 text-muted-foreground">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/linkedin.svg" alt="LinkedIn" className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-xs">لا يوجد حساب مرتبط</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  LinkedIn Blocks List                                               */
/* ------------------------------------------------------------------ */

export function LinkedInBlocksList() {
  const { user } = useAuth();
  const [blocks, setBlocks] = useState<LinkedInBlock[]>([]);
  const [connection, setConnection] = useState<LinkedInConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const { show: showToast } = useToast();

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [blocksData, statusData] = await Promise.all([
        getLinkedInBlocks(),
        getLinkedInStatus(),
      ]);
      setBlocks(blocksData);
      setConnection(statusData.connection);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  const handleDelete = useCallback(
    async (blockId: string) => {
      try {
        await deleteLinkedInBlock(blockId);
        setBlocks((prev) => prev.filter((b) => b.id !== blockId));
        showToast({ title: 'تم الحذف', message: 'تم حذف البلوك', variant: 'success' });
      } catch {
        showToast({ title: 'خطأ', message: 'فشل الحذف', variant: 'error' });
      }
    },
    [showToast],
  );

  const handleToggle = useCallback(
    async (blockId: string) => {
      try {
        await toggleLinkedInBlock(blockId);
        setBlocks((prev) =>
          prev.map((b) => (b.id === blockId ? { ...b, isActive: !b.isActive } : b)),
        );
      } catch {
        showToast({ title: 'خطأ', message: 'فشل التحديث', variant: 'error' });
      }
    },
    [showToast],
  );

  if (!user || loading) return null;
  if (blocks.length === 0) return null;

  return (
    <div className="space-y-3">
      <AnimatePresence mode="popLayout">
        {blocks.map((block) => (
          <LinkedInBlockCard
            key={block.id}
            block={block}
            connection={connection}
            onDelete={handleDelete}
            onToggle={handleToggle}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

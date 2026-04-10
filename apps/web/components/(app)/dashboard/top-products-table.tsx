"use client";

/**
 * 📦 Top Products Component
 * المنتجات الأكثر مبيعاً — تصميم متناسق
 *
 * Design tokens (shared):
 *   Card:     rounded-2xl, p-5, border border-border/60
 *   Header:   icon w-8 h-8 rounded-xl, title text-sm font-bold
 *   Row:      rounded-xl, px-3 py-2.5, gap-3
 *   Rank:     w-9 h-9 rounded-xl
 *   Title:    text-sm font-semibold
 *   Body:     text-xs
 *   Small:    text-[11px]
 */

import { motion } from "framer-motion";
import { Package, TrendingUp, ArrowUpLeft, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatIQD } from "@/lib/currency";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface TopProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  amount: number;
}

interface TopProductsTableProps {
  products?: TopProduct[];
  formatCurrency?: (amount: number) => string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function TopProductsTable({
  products = [],
  formatCurrency = formatIQD,
}: TopProductsTableProps) {
  /* ── Empty ── */
  if (!products || products.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5"
      >
        <SectionHeader formatCurrency={formatCurrency} totalAmount={0} />
        <div className="flex flex-col items-center justify-center py-10">
          <div className="w-14 h-14 rounded-2xl bg-muted/30 flex items-center justify-center mb-3">
            <ShoppingBag className="w-7 h-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium text-muted-foreground">لا توجد منتجات بعد</p>
        </div>
      </motion.div>
    );
  }

  const totalAmount = products.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5"
    >
      <SectionHeader
        totalAmount={totalAmount}
        formatCurrency={formatCurrency}
        trailing={
          <Link
            href="/app/store/products"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-primary hover:bg-primary/8 transition-colors"
          >
            عرض الكل
            <ArrowUpLeft className="w-3.5 h-3.5" />
          </Link>
        }
      />

      {/* Products */}
      <div className="space-y-2 mt-4">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all duration-200",
              i === 0
                ? "bg-primary/5 border-primary/10 hover:border-primary/20"
                : "bg-transparent border-transparent hover:bg-muted/25 hover:border-border/40"
            )}
          >
            {/* Rank */}
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold",
                i === 0
                  ? "bg-primary/12 text-primary"
                  : i === 1
                    ? "bg-muted/50 text-foreground"
                    : i === 2
                      ? "bg-warning/12 text-warning"
                      : "bg-muted/30 text-muted-foreground"
              )}
            >
              {i + 1}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate leading-none mb-1">
                {product.name}
              </p>
              <p className="text-xs text-muted-foreground leading-none">
                {formatCurrency(product.price || 0)} × {product.quantity || 0}
              </p>
            </div>

            {/* Amount */}
            <div className="shrink-0 text-left flex flex-col items-end gap-0.5">
              <span className="text-sm font-bold text-foreground tabular-nums leading-none">
                {formatCurrency(product.amount || 0)}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-success leading-none">
                <TrendingUp className="w-3 h-3" />
                {product.quantity || 0} مبيعة
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function SectionHeader({
  totalAmount,
  formatCurrency,
  trailing,
}: {
  totalAmount: number;
  formatCurrency: (n: number) => string;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-1">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Package className="w-4 h-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground leading-none">المنتجات الأكثر مبيعاً</h3>
          {totalAmount > 0 && (
            <p className="text-xs text-muted-foreground mt-1 leading-none">
              إجمالي: {formatCurrency(totalAmount)}
            </p>
          )}
        </div>
      </div>
      {trailing}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Skeleton                                                           */
/* ------------------------------------------------------------------ */

export function TopProductsTableSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4 sm:p-5">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-muted/40 animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-muted/40 rounded animate-pulse" />
            <div className="h-3 w-20 bg-muted/25 rounded animate-pulse" />
          </div>
        </div>
        <div className="h-6 w-16 bg-muted/30 rounded-lg animate-pulse" />
      </div>
      <div className="space-y-2 mt-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-muted/30 animate-pulse" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3.5 w-3/4 bg-muted/30 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted/20 rounded animate-pulse" />
            </div>
            <div className="flex flex-col items-end gap-1">
              <div className="h-3.5 w-20 bg-muted/30 rounded animate-pulse" />
              <div className="h-3 w-14 bg-muted/20 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

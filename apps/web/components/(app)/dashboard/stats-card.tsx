"use client";

/**
 * 📊 Stats Card Component
 * بطاقة إحصائيات — تصميم متناسق
 *
 * Design tokens (shared):
 *   Card:   rounded-2xl, p-5, border border-border/60
 *   Title:  text-xs text-muted-foreground
 *   Value:  text-2xl font-bold
 *   Change: text-xs font-medium
 */

import { TrendingUp, TrendingDown } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  highlight?: boolean;
}

export function StatsCard({
  title,
  value,
  change,
  trend,
  highlight = false,
}: StatsCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={cn(
        "rounded-2xl p-3.5 sm:p-5 border transition-colors",
        highlight
          ? "bg-primary/5 border-primary/10"
          : "bg-card border-border/60 hover:border-primary/20"
      )}
    >
      <p className="text-[11px] sm:text-xs text-muted-foreground mb-1.5 sm:mb-2 leading-none">{title}</p>

      <h3 className="text-lg sm:text-2xl font-bold text-foreground tabular-nums mb-1 leading-none">
        {value}
      </h3>

      <div className="flex items-center gap-1.5">
        {trend === "up" ? (
          <TrendingUp className="w-3.5 h-3.5 text-success" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-destructive" />
        )}
        <span
          className={cn(
            "text-xs font-medium leading-none",
            trend === "up" ? "text-success" : "text-destructive"
          )}
        >
          {change}
        </span>
      </div>
    </motion.div>
  );
}

export function StatsCardSkeleton() {
  return (
    <div className="rounded-2xl p-3.5 sm:p-5 bg-card border border-border/40">
      <div className="h-3 w-16 bg-muted/40 rounded animate-pulse mb-2" />
      <div className="h-7 w-20 bg-muted/40 rounded animate-pulse mb-1" />
      <div className="flex items-center gap-1.5">
        <div className="h-3.5 w-3.5 bg-muted/30 rounded animate-pulse" />
        <div className="h-3 w-10 bg-muted/30 rounded animate-pulse" />
      </div>
    </div>
  );
}

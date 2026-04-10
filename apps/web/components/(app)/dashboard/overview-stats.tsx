"use client";

/**
 * 📊 Overview Stats Component
 * بطاقات إحصائيات عمودية بتصميم عصري
 * مستوحى من التصميم المرفق
 */

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, BarChart3, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatItem {
  label: string;
  value: string | number;
  change: number; // نسبة التغيير (موجب أو سالب)
  highlight?: boolean; // هل هذا العنصر مميز
}

interface OverviewStatsProps {
  title?: string;
  subtitle?: string;
  stats: StatItem[];
}

export function OverviewStats({ 
  title = "نظرة عامة", 
  subtitle = "إحصائياتك. اختر فترة وتابع نشاطك",
  stats 
}: OverviewStatsProps) {
  const values = stats.map(s => typeof s.value === 'number' ? s.value : parseInt(s.value.toString().replace(/,/g, '')) || 0);
  const maxValue = Math.max(...values);
  const allEqual = values.every(v => v === values[0]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl bg-card border border-border/60 p-4 sm:p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>

      {/* Stats Bars */}
      <div className="flex items-end justify-between gap-2 h-[160px]">
        {stats.map((stat, index) => {
          const numValue = typeof stat.value === 'number' 
            ? stat.value 
            : parseInt(stat.value.toString().replace(/,/g, '')) || 0;
          // إذا كانت كل القيم متساوية (بما في ذلك 0)، اجعل الأعمدة بنفس الارتفاع
          const heightPercent = allEqual ? 50 : (maxValue > 0 ? (numValue / maxValue) * 100 : 50);
          
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="flex-1 flex flex-col items-center mt-6"
            >
              {/* Bar Container */}
              <div 
                className="relative w-full flex flex-col items-center justify-end h-[120px]"
              >
                {/* Value inside bar */}
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(heightPercent, 30)}%` }}
                  transition={{ duration: 0.6, delay: index * 0.1, ease: "easeOut" }}
                  className={cn(
                    "w-full rounded-xl flex flex-col items-center justify-start pt-2 px-1 min-h-[40px]",
                    stat.highlight 
                      ? "bg-primary/15 dark:bg-primary/10" 
                      : "bg-muted/60 dark:bg-muted/40"
                  )}
                >
                  {/* Label at top of bar */}
                  <span className={cn(
                    "text-[10px] whitespace-nowrap mb-0.5",
                    stat.highlight ? "text-foreground/70" : "text-muted-foreground"
                  )}>
                    {stat.label}
                  </span>
                  {/* Value */}
                  <span className={cn(
                    "text-sm font-bold",
                    stat.highlight ? "text-foreground" : "text-foreground"
                  )}>
                    {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
                  </span>
                </motion.div>
              </div>

              {/* Change Indicator */}
              <div className="flex items-center gap-1 mt-2">
                {stat.change >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-success" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-destructive" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  stat.change >= 0 ? "text-success" : "text-destructive"
                )}>
                  {stat.change >= 0 ? "+" : ""}{stat.change}%
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function OverviewStatsSkeleton() {
  return (
    <div className="rounded-2xl bg-card border border-border/40 p-4 sm:p-5">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          <div className="h-4 w-48 bg-muted rounded animate-pulse mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-muted rounded-xl animate-pulse" />
          <div className="w-8 h-8 bg-muted rounded-xl animate-pulse" />
        </div>
      </div>
      <div className="flex items-end justify-between gap-2 h-[160px]">
        {[65, 45, 100, 55].map((height, i) => (
          <div key={i} className="flex-1 flex flex-col items-center">
            <div 
              className="w-full bg-muted/60 rounded-2xl animate-pulse"
              style={{ height: `${height}%` }}
            />
            <div className="h-4 w-12 bg-muted rounded animate-pulse mt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}

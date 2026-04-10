'use client';

import { Loader2, LogOut } from 'lucide-react';
import { useAuth } from '@/providers/auth-provider';

export default function DashboardPage() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-4" dir="rtl">
      <h1 className="text-3xl font-light tracking-tight text-zinc-900 dark:text-white">
        مرحباً بك{user?.name ? ` ${user.name}` : ''}
      </h1>

      <button
        onClick={() => logout()}
        className="flex items-center justify-center gap-2 h-[48px] px-8 border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-[14px] rounded-full font-semibold transition-all"
      >
        <LogOut className="h-4 w-4" />
        <span>تسجيل الخروج</span>
      </button>
    </div>
  );
}

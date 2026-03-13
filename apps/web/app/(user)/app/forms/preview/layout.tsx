import type { ReactNode } from 'react';

/**
 * Full-screen layout for form preview — no sidebar, no dashboard nav.
 * Uses fixed positioning to overlay the parent dashboard layout.
 */
export default function PreviewFormLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div dir="rtl" className="fixed inset-0 z-50 bg-background overflow-hidden">
      {children}
    </div>
  );
}

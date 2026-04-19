import type { ReactNode } from 'react';

/**
 * Full-screen layout for product creation — no sidebar, no dashboard nav.
 * Matches the form creation wizard layout.
 */
export default function CreateProductLayout({
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

'use client';

/**
 * Suppress known HeroUI v3 beta console warnings.
 * These are internal Focusable warnings that cannot be fixed from userland.
 * Remove this once HeroUI v3 reaches stable.
 */
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = (...args: unknown[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('<Focusable> child must be focusable')
    ) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

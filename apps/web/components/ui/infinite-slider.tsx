'use client';
import { cn } from '@/lib/utils';
import { Children, useId } from 'react';

type InfiniteSliderProps = {
  children: React.ReactNode;
  gap?: number;
  duration?: number;
  direction?: 'horizontal' | 'vertical';
  reverse?: boolean;
  className?: string;
};

export function InfiniteSlider({
  children,
  gap = 16,
  duration = 25,
  direction = 'horizontal',
  reverse = false,
  className,
}: InfiniteSliderProps) {
  const id = useId().replace(/:/g, '');
  const childArray = Children.toArray(children);
  const isHorizontal = direction === 'horizontal';
  const animName = `is${id}`;

  // Each track has paddingRight/Bottom = gap so its width = N*(itemW+gap)
  // Total width = 3 * N*(itemW+gap), so -33.333% = exactly one track width → seamless loop
  const keyframes = isHorizontal
    ? `@keyframes ${animName} { from { transform: translateX(0); } to { transform: translateX(-33.3333%); } }`
    : `@keyframes ${animName} { from { transform: translateY(0); } to { transform: translateY(-33.3333%); } }`;

  return (
    <div className={cn('overflow-hidden', className)}>
      <style>{keyframes}</style>
      <div
        className={cn('flex w-max', isHorizontal ? 'flex-row' : 'flex-col')}
        style={{
          animation: `${animName} ${duration}s linear infinite`,
          animationDirection: reverse ? 'reverse' : 'normal',
          willChange: 'transform',
        }}
      >
        {[0, 1, 2].map((trackIndex) => (
          <div
            key={trackIndex}
            aria-hidden={trackIndex === 0 ? undefined : 'true'}
            className={cn('flex shrink-0', isHorizontal ? 'flex-row' : 'flex-col')}
            style={{
              gap: `${gap}px`,
              ...(isHorizontal
                ? { paddingRight: `${gap}px` }
                : { paddingBottom: `${gap}px` }),
            }}
          >
            {childArray}
          </div>
        ))}
      </div>
    </div>
  );
}

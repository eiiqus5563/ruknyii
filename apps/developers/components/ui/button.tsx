import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'ghost' | 'danger';
type Size = 'xs' | 'sm' | 'md' | 'icon-sm' | 'icon-xs';

const variantStyles: Record<Variant, string> = {
  default: 'bg-foreground text-background hover:bg-foreground/90',
  secondary: 'bg-default text-foreground hover:bg-default/80',
  ghost: 'bg-transparent hover:bg-default text-foreground',
  danger: 'bg-danger text-danger-foreground hover:bg-danger/90',
};

const sizeStyles: Record<Size, string> = {
  xs: 'h-7 px-2.5 text-[11px] rounded-lg',
  sm: 'h-8 px-3 text-xs rounded-lg',
  md: 'h-9 px-4 text-sm rounded-xl',
  'icon-sm': 'size-8 rounded-lg',
  'icon-xs': 'size-6 rounded-md',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'md', disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none cursor-pointer',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = 'Button';

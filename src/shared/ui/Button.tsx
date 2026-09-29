import type { ButtonHTMLAttributes } from 'react';

const VARIANTS = {
  primary: 'bg-accent text-on-accent hover:bg-accent/90',
  secondary: 'border border-line-strong bg-surface text-fg hover:bg-surface-strong',
  ghost: 'text-fg-muted hover:bg-surface-strong hover:text-fg',
  danger: 'bg-danger text-on-danger hover:bg-danger/90',
  'danger-subtle': 'text-danger hover:bg-danger-soft',
} as const;

const SIZES = {
  sm: 'gap-1 px-2.5 py-1 text-xs',
  md: 'gap-1.5 px-3.5 py-2 text-sm',
  /** Square, for a button that shows only an icon: give it an aria-label. */
  icon: 'p-2',
} as const;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof VARIANTS;
  size?: keyof typeof SIZES;
}

/** A button in one of the app's styles. It is type="button" unless told otherwise. */
export function Button({
  variant = 'secondary',
  size = 'md',
  type = 'button',
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      {...props}
    />
  );
}

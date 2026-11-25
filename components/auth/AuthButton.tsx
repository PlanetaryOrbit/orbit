import { IconLoader2 } from '@tabler/icons-react';
import clsx from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'md' | 'sm';

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-xl px-5 text-sm font-medium transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:cursor-not-allowed disabled:opacity-40 dark:focus-visible:ring-offset-zinc-950';

const variantClasses: Record<Variant, string> = {
  primary: 'bg-primary text-[color:var(--on-primary)] hover:bg-primary/90',
  secondary:
    'bg-zinc-100 text-zinc-700 hover:bg-zinc-200 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10',
  ghost: 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white',
};

const sizeClasses: Record<Size, string> = {
  md: 'h-11',
  sm: 'h-9',
};

export const authLinkClass =
  'text-sm text-zinc-500 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-white';

export const authActionClass =
  'text-sm font-medium text-zinc-900 underline-offset-4 hover:underline dark:text-white';

type AuthButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
};

export default function AuthButton({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: AuthButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(baseClass, variantClasses[variant], sizeClasses[size], className)}
    >
      {loading && <IconLoader2 className='h-4 w-4 animate-spin' />}
      {children}
    </button>
  );
}

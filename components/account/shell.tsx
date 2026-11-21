import {
  workspacesPanelShadow,
  workspacesPrimaryButtonClass,
  workspacesSecondaryButtonClass,
} from '@/components/workspaces/shell';
import clsx from 'clsx';
import type { ReactNode } from 'react';

export const accountPanelClass = clsx(
  'rounded-2xl bg-white dark:bg-zinc-900/70',
  workspacesPanelShadow,
);

export const accountPrimaryButtonClass = workspacesPrimaryButtonClass;
export const accountSecondaryButtonClass = workspacesSecondaryButtonClass;

export const accountDangerButtonClass =
  'inline-flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-zinc-200 dark:bg-zinc-800 dark:text-red-400 dark:hover:bg-zinc-700';

export const accountInputClass =
  'w-full rounded-xl border-0 bg-zinc-100 px-3 py-2 text-sm text-zinc-900 outline-none transition focus:outline-none focus:ring-2 focus:ring-primary/40 dark:bg-zinc-800 dark:text-white';

export function AccountPanel({ children, className }: { children: ReactNode; className?: string }) {
  return <section className={clsx(accountPanelClass, className)}>{children}</section>;
}

export function AccountPanelHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className='flex flex-wrap items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 dark:border-zinc-800 sm:px-6'>
      <div className='min-w-0'>
        <h2 className='text-sm font-semibold text-zinc-900 dark:text-white'>{title}</h2>
        <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>{description}</p>
      </div>
      {action}
    </div>
  );
}

export function AccountField({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <div className='rounded-xl bg-zinc-50 px-4 py-3 dark:bg-zinc-800/40'>
      <p className='text-[11px] font-medium uppercase tracking-wide text-zinc-400'>{label}</p>
      <div className='mt-1 truncate text-sm font-medium text-zinc-900 dark:text-white'>{value}</div>
      {hint && <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>{hint}</p>}
    </div>
  );
}

export function AccountToggle({
  checked,
  onChange,
  label,
  description,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  disabled?: boolean;
}) {
  return (
    <div className='flex items-center justify-between gap-4 px-5 py-4 dark:px-6'>
      <div className='min-w-0'>
        <p className='text-sm font-medium text-zinc-900 dark:text-white'>{label}</p>
        <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>{description}</p>
      </div>
      <button
        type='button'
        role='switch'
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={clsx(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-zinc-200 dark:bg-zinc-700',
        )}
      >
        <span
          className={clsx(
            'absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

export function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span
      className={clsx(
        'inline-block h-1.5 w-1.5 rounded-full',
        connected ? 'bg-emerald-500' : 'bg-zinc-300 dark:bg-zinc-600',
      )}
    />
  );
}

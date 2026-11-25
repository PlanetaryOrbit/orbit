import { Menu } from '@headlessui/react';
import clsx from 'clsx';
import type { ReactNode } from 'react';

type MenuRowBaseProps = {
  icon: ReactNode;
  label: string;
  detail?: string;
  tone?: 'default' | 'danger';
};

type MenuRowProps = MenuRowBaseProps &
  ({ href: string; onClick?: never } | { onClick: () => void; href?: never });

export function MenuDivider() {
  return (
    <div
      role='separator'
      className='my-1.5 h-px bg-zinc-100 dark:bg-white/5'
    />
  );
}

export default function MenuRow({
  icon,
  label,
  detail,
  tone = 'default',
  href,
  onClick,
}: MenuRowProps) {
  const danger = tone === 'danger';

  const content = (
    <>
      <span className='flex h-4 w-4 shrink-0 items-center justify-center'>{icon}</span>
      <span className='flex-1 text-left'>{label}</span>
      {detail && (
        <span className='max-w-[7rem] truncate text-xs text-zinc-400 dark:text-zinc-500'>
          {detail}
        </span>
      )}
    </>
  );

  return (
    <Menu.Item>
      {({ active }) => {
        const className = clsx(
          'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          danger ? 'text-red-600 dark:text-red-400' : 'text-zinc-700 dark:text-zinc-200',
          active && (danger ? 'bg-red-50 dark:bg-red-500/10' : 'bg-zinc-100 dark:bg-white/5'),
        );

        return href ? (
          <a
            href={href}
            target='_blank'
            rel='noopener noreferrer'
            className={className}
          >
            {content}
            <span className='sr-only'> (opens in a new tab)</span>
          </a>
        ) : (
          <button
            type='button'
            onClick={onClick}
            className={className}
          >
            {content}
          </button>
        );
      }}
    </Menu.Item>
  );
}

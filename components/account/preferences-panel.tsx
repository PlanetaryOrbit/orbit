import { IconCheck, IconDeviceDesktop, IconMoon, IconSun } from '@tabler/icons-react';
import clsx from 'clsx';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { AccountPanel, AccountPanelHeader, AccountToggle } from './shell';
import type { AccountPreferences } from './types';

type PreferencesPanelProps = {
  preferences: AccountPreferences;
  onChange: (preferences: AccountPreferences) => void;
};

const THEMES = [
  {
    value: 'system',
    label: 'System',
    description: 'Follow your device setting',
    icon: IconDeviceDesktop,
  },
  {
    value: 'light',
    label: 'Light',
    description: 'Always use the light theme',
    icon: IconSun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Always use the dark theme',
    icon: IconMoon,
  },
] as const;

export default function PreferencesPanel({ preferences, onChange }: PreferencesPanelProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const activeTheme = mounted ? (theme ?? 'system') : 'system';

  return (
    <div className='space-y-5'>
      <AccountPanel>
        <AccountPanelHeader
          title='Appearance'
          description='Choose how Orbit looks on this device.'
        />

        <div className='p-5 sm:px-6'>
          <p className='text-xs font-medium text-zinc-600 dark:text-zinc-300'>Theme</p>
          <div className='mt-3 grid gap-3 sm:grid-cols-3'>
            {THEMES.map(({ value, label, description, icon: Icon }) => {
              const selected = activeTheme === value;

              return (
                <button
                  key={value}
                  type='button'
                  onClick={() => setTheme(value)}
                  aria-pressed={selected}
                  className={clsx(
                    'flex flex-col items-start rounded-xl border px-3 py-3 text-left transition',
                    selected
                      ? 'border-zinc-300 bg-zinc-50 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-800/60 dark:text-white'
                      : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-400 dark:hover:bg-zinc-800/40',
                  )}
                >
                  <div className='flex w-full items-start justify-between gap-2'>
                    <Icon
                      className='h-4 w-4'
                      stroke={1.75}
                    />
                    {selected && (
                      <IconCheck
                        className='h-4 w-4 text-primary'
                        stroke={2.2}
                      />
                    )}
                  </div>
                  <span className='mt-3 text-sm font-medium'>{label}</span>
                  <span className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-500'>
                    {description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </AccountPanel>

      <AccountPanel>
        <AccountPanelHeader
          title='Interface'
          description='Fine-tune animations and spacing across Orbit.'
        />
        <div className='divide-y divide-zinc-100 dark:divide-zinc-800'>
          <AccountToggle
            checked={preferences.reduceMotion}
            onChange={(reduceMotion) => onChange({ ...preferences, reduceMotion })}
            label='Reduce motion'
            description='Minimise animations and transitions throughout Orbit.'
          />
          <AccountToggle
            checked={preferences.compact}
            onChange={(compact) => onChange({ ...preferences, compact })}
            label='Compact layout'
            description='Use tighter page spacing to fit more on screen.'
          />
        </div>
        <div className='border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400 sm:px-6'>
          Preferences are saved on this device only and apply immediately.
        </div>
      </AccountPanel>
    </div>
  );
}

import type { LoginState } from '@/state';
import { IconCheck, IconRefresh } from '@tabler/icons-react';

import {
  AccountField,
  AccountPanel,
  AccountPanelHeader,
  accountSecondaryButtonClass,
} from './shell';

type ProfilePanelProps = {
  login: LoginState;
  refreshing: boolean;
  onRefresh: () => void;
  sessionsCount: number;
};

export default function ProfilePanel({
  login,
  refreshing,
  onRefresh,
  sessionsCount,
}: ProfilePanelProps) {
  const connectedProviders = 1 + (login.discordUser ? 1 : 0) + (login.googleUser ? 1 : 0);

  return (
    <div className='space-y-5'>
      <AccountPanel className='overflow-hidden'>
        <div className='flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:px-6'>
          <img
            src={login.thumbnail || '/default-avatar.jpg'}
            alt={`${login.displayname || login.username}'s Roblox avatar`}
            className='h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-zinc-200 dark:ring-zinc-700'
          />

          <div className='min-w-0 flex-1'>
            <div className='flex flex-wrap items-center gap-2'>
              <h2 className='text-lg font-semibold text-zinc-900 dark:text-white'>
                {login.displayname || login.username || 'Orbit user'}
              </h2>
              <span className='rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'>
                Roblox account
              </span>
            </div>
            <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
              @{login.username || 'unknown'} · ID {String(login.userId)}
            </p>
            <p className='mt-2 text-sm text-zinc-500 dark:text-zinc-400'>
              Your Roblox account is the primary identity. Username and display name are synced from
              Roblox.
            </p>
          </div>

          <button
            type='button'
            disabled={refreshing}
            onClick={onRefresh}
            className={accountSecondaryButtonClass}
          >
            <IconRefresh
              className={refreshing ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
              stroke={1.75}
            />
            {refreshing ? 'Syncing…' : 'Sync from Roblox'}
          </button>
        </div>
      </AccountPanel>

      <AccountPanel>
        <AccountPanelHeader
          title='Roblox profile'
          description='Read-only details kept in sync with your Roblox account.'
        />
        <div className='grid gap-3 p-5 sm:grid-cols-2 sm:px-6'>
          <AccountField
            label='Roblox username'
            value={`@${login.username || '—'}`}
          />
          <AccountField
            label='Display name'
            value={login.displayname || '—'}
          />
          <AccountField
            label='Roblox user ID'
            value={String(login.userId)}
          />
          <AccountField
            label='Avatar'
            value='Synced from Roblox'
            hint='Use “Sync from Roblox” to refresh it'
          />
        </div>
      </AccountPanel>
    </div>
  );
}

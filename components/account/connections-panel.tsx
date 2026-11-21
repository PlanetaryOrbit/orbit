import type { useOAuthConfig } from '@/hooks/useOAuthConfig';
import type { LoginState } from '@/state';
import { IconLink, IconPlugConnected } from '@tabler/icons-react';

import { AccountPanel, AccountPanelHeader, accountSecondaryButtonClass, StatusDot } from './shell';
import type { ProviderKey } from './types';

type OAuthConfig = ReturnType<typeof useOAuthConfig>;

type ConnectionsPanelProps = {
  login: LoginState;
  oauthConfig: OAuthConfig;
  onConnect: (provider: ProviderKey) => void;
  onDisconnect: (provider: ProviderKey) => void;
};

function RobloxIdentity({ login }: { login: LoginState }) {
  return (
    <div className='flex flex-wrap items-center gap-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/40'>
      <img
        src='/roblox.svg'
        alt=''
        className='h-10 w-10'
      />
      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <p className='text-sm font-medium text-zinc-900 dark:text-white'>Roblox</p>
          <span className='rounded-md bg-zinc-200/70 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300'>
            Primary
          </span>
        </div>
        <p className='mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400'>
          @{login.username || 'unknown'}
        </p>
      </div>
      <div className='flex items-center gap-1.5 text-xs font-medium text-emerald-600 dark:text-emerald-400'>
        <StatusDot connected />
        Connected
      </div>
    </div>
  );
}

type ProviderCardProps = {
  name: string;
  description: string;
  avatar: string;
  invertAvatar?: boolean;
  identity?: string | null;
  available: boolean;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
};

function ProviderCard({
  name,
  description,
  avatar,
  invertAvatar,
  identity,
  available,
  loading,
  onConnect,
  onDisconnect,
}: ProviderCardProps) {
  const connected = Boolean(identity);

  return (
    <div className='flex flex-wrap items-center gap-4 rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/40'>
      <img
        src={avatar}
        alt=''
        className={`h-10 w-10 rounded-lg object-cover ${invertAvatar ? 'invert dark:invert-0' : ''}`}
      />

      <div className='min-w-0 flex-1'>
        <div className='flex flex-wrap items-center gap-2'>
          <p className='text-sm font-medium text-zinc-900 dark:text-white'>{name}</p>
          <div className='flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400'>
            <StatusDot connected={connected} />
            {connected ? 'Connected' : 'Not connected'}
          </div>
        </div>
        <p className='mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400'>
          {identity || description}
        </p>
      </div>

      {loading ? (
        <div className='h-8 w-20 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-700' />
      ) : !available ? (
        <span className='rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-500 dark:bg-zinc-700/50 dark:text-zinc-400'>
          Unavailable
        </span>
      ) : connected ? (
        <button
          type='button'
          onClick={onDisconnect}
          className='rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600'
        >
          Disconnect
        </button>
      ) : (
        <button
          type='button'
          onClick={onConnect}
          className={accountSecondaryButtonClass}
        >
          <IconPlugConnected
            className='h-4 w-4'
            stroke={1.75}
          />
          Connect
        </button>
      )}
    </div>
  );
}

export default function ConnectionsPanel({
  login,
  oauthConfig,
  onConnect,
  onDisconnect,
}: ConnectionsPanelProps) {
  const discordAvatar = login.discordUser?.avatar
    ? `https://cdn.discordapp.com/avatars/${login.discordUser.discordUserId}/${login.discordUser.avatar}.png`
    : '/discord.svg';

  const googleAvatar = login.googleUser?.avatar
    ? `/api/google/avatar-proxy?url=${encodeURIComponent(login.googleUser.avatar)}`
    : '/google.svg';

  return (
    <div className='space-y-5'>
      <AccountPanel>
        <AccountPanelHeader
          title='Connected accounts'
          description='Link external accounts to sign in faster. Your Roblox account stays primary.'
        />

        <div className='space-y-3 p-5 sm:px-6'>
          <RobloxIdentity login={login} />

          <ProviderCard
            name='Discord'
            description='Connect your Discord account'
            avatar={discordAvatar}
            invertAvatar={!login.discordUser?.avatar}
            identity={login.discordUser?.username || null}
            available={oauthConfig.discord.available}
            loading={oauthConfig.loading}
            onConnect={() => onConnect('discord')}
            onDisconnect={() => onDisconnect('discord')}
          />

          <ProviderCard
            name='Google'
            description='Connect your Google account'
            avatar={googleAvatar}
            identity={login.googleUser?.email || login.googleUser?.username || null}
            available={oauthConfig.google.available}
            loading={oauthConfig.loading}
            onConnect={() => onConnect('google')}
            onDisconnect={() => onDisconnect('google')}
          />
        </div>

        <div className='border-t border-zinc-100 px-5 py-3 text-xs text-zinc-500 dark:border-zinc-800 sm:px-6'>
          Connecting opens the provider’s sign-in page and returns you here. We never ask for your
          external account password.
        </div>
      </AccountPanel>

      <AccountPanel className='p-5 sm:p-6'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            <p className='text-sm font-medium text-zinc-900 dark:text-white'>
              Need another sign-in method?
            </p>
            <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
              <IconLink
                className='mr-1 inline h-3.5 w-3.5 align-[-2px]'
                stroke={1.75}
              />
              Set a password under Security. Roblox login is always available.
            </p>
          </div>
        </div>
      </AccountPanel>
    </div>
  );
}

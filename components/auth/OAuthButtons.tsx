import Image from 'next/image';

import AuthButton from './AuthButton';

const PROVIDERS = [
  { id: 'roblox', label: 'Roblox', icon: '/roblox.svg', href: '/api/auth/roblox/start' },
  { id: 'discord', label: 'Discord', icon: '/discord.svg', href: '/api/auth/discord/start' },
  { id: 'google', label: 'Google', icon: '/google.svg', href: '/api/auth/google/start' },
] as const;

type ProviderId = (typeof PROVIDERS)[number]['id'];

export type AvailableProviders = Record<ProviderId, boolean>;

export function hasProviders(providers: AvailableProviders) {
  return Object.values(providers).some(Boolean);
}

type OAuthButtonsProps = {
  providers: AvailableProviders;
  disabled?: boolean;
};

export default function OAuthButtons({ providers, disabled }: OAuthButtonsProps) {
  return (
    <div className='flex flex-col gap-2.5'>
      {PROVIDERS.filter(({ id }) => providers[id]).map(({ id, label, icon, href }) => (
        <AuthButton
          key={id}
          type='button'
          variant='secondary'
          disabled={disabled}
          onClick={() => {
            window.location.href = href;
          }}
          className='w-full'
        >
          <Image
            src={icon}
            alt=''
            width={20}
            height={20}
            unoptimized
            className='h-5 w-5 invert dark:invert-0'
          />
          Continue with {label}
        </AuthButton>
      ))}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className='my-6 flex items-center gap-3 text-xs text-zinc-400 dark:text-zinc-500'>
      <span className='h-px flex-1 bg-zinc-200 dark:bg-white/10' />
      or
      <span className='h-px flex-1 bg-zinc-200 dark:bg-white/10' />
    </div>
  );
}

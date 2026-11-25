import { useAccountActions } from '@/hooks/useAccountActions';
import { useOAuthConfig } from '@/hooks/useOAuthConfig';
import { loginState } from '@/state';
import { Menu } from '@headlessui/react';
import {
  IconChevronDown,
  IconCrown,
  IconDevices,
  IconLogout,
  IconSettings,
  IconTrash,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useRecoilValue } from 'recoil';

import MenuRow, { MenuDivider } from '../menu/MenuRow';
import Avatar from './Avatar';
import { LINKABLE_PROVIDERS } from './providers';

const ICON_CLASS = 'h-4 w-4';
const ICON_STROKE = 1.75;

type AccountMenuProps = {
  onOpenSessions: () => void;
};

export default function AccountMenu({ onOpenSessions }: AccountMenuProps) {
  const login = useRecoilValue(loginState);
  const router = useRouter();
  const oauth = useOAuthConfig();
  const { logout, deleteAccount, linkProvider, unlinkProvider } = useAccountActions();

  const providers = LINKABLE_PROVIDERS.filter(({ id }) => oauth[id].available);

  return (
    <Menu
      as='div'
      className='relative'
    >
      {({ open }) => (
        <>
          <Menu.Button
            aria-label='Open account menu'
            className='group flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/5'
          >
            <span className='relative'>
              <Avatar
                src={login.thumbnail}
                alt={login.displayname || 'Profile'}
                className='h-8 w-8'
              />
              {login.isOwner && (
                <span className='absolute -right-0.5 -bottom-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-950'>
                  <IconCrown
                    className='h-2 w-2 text-white'
                    stroke={2.5}
                  />
                </span>
              )}
            </span>
            <span className='hidden text-sm font-medium text-zinc-800 sm:block dark:text-zinc-100'>
              {login.displayname}
            </span>
            <motion.span
              animate={{ rotate: open ? 180 : 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className='hidden text-zinc-400 sm:block'
            >
              <IconChevronDown
                className='h-4 w-4'
                stroke={ICON_STROKE}
              />
            </motion.span>
          </Menu.Button>

          <AnimatePresence>
            {open && (
              <Menu.Items
                static
                as={motion.div}
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 440, damping: 32, mass: 0.7 }}
                className='absolute right-0 z-50 mt-2 w-72 origin-top-right rounded-2xl bg-white p-1.5 shadow-xl shadow-zinc-950/10 ring-1 ring-zinc-950/5 focus:outline-none dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/10'
              >
                <div className='flex items-center gap-3 px-3 py-3'>
                  <Avatar
                    src={login.thumbnail}
                    alt={login.displayname || 'Profile'}
                    className='h-10 w-10'
                  />
                  <div className='min-w-0'>
                    <p className='truncate text-sm font-semibold text-zinc-900 dark:text-white'>
                      {login.displayname}
                    </p>
                    <p className='truncate text-xs text-zinc-500 dark:text-zinc-400'>
                      @{login.username}
                    </p>
                  </div>
                </div>

                <MenuDivider />

                <MenuRow
                  icon={
                    <IconSettings
                      className={ICON_CLASS}
                      stroke={ICON_STROKE}
                    />
                  }
                  label='Account settings'
                  onClick={() => router.push('/settings')}
                />
                <MenuRow
                  icon={
                    <IconDevices
                      className={ICON_CLASS}
                      stroke={ICON_STROKE}
                    />
                  }
                  label='Sessions'
                  onClick={onOpenSessions}
                />

                {providers.length > 0 && (
                  <>
                    <MenuDivider />
                    {providers.map((provider) => {
                      const account = login[provider.accountKey];

                      return (
                        <MenuRow
                          key={provider.id}
                          icon={
                            <Image
                              src={provider.icon}
                              alt=''
                              width={16}
                              height={16}
                              className='h-4 w-4 invert dark:invert-0'
                            />
                          }
                          label={`${account ? 'Unlink' : 'Link'} ${provider.label}`}
                          detail={account?.username}
                          onClick={() =>
                            account ? unlinkProvider(provider) : linkProvider(provider)
                          }
                        />
                      );
                    })}
                  </>
                )}

                <MenuDivider />

                <MenuRow
                  icon={
                    <IconLogout
                      className={ICON_CLASS}
                      stroke={ICON_STROKE}
                    />
                  }
                  label='Log out'
                  onClick={logout}
                />

                {!login.canMakeWorkspace && (
                  <MenuRow
                    tone='danger'
                    icon={
                      <IconTrash
                        className={ICON_CLASS}
                        stroke={ICON_STROKE}
                      />
                    }
                    label='Delete account'
                    onClick={deleteAccount}
                  />
                )}
              </Menu.Items>
            )}
          </AnimatePresence>
        </>
      )}
    </Menu>
  );
}

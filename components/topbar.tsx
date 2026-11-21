import { useOAuthConfig } from '@/hooks/useOAuthConfig';
import { loginState } from '@/state';
import { Dialog, Menu, Transition } from '@headlessui/react';
import {
  IconLogout,
  IconChevronDown,
  IconSun,
  IconMoon,
  IconSettings,
  IconDeviceLaptop,
  IconDeviceMobile,
  IconDevices,
  IconChevronLeft,
  IconTrash,
  IconRefresh,
  IconX,
  IconCrown,
  IconXd,
} from '@tabler/icons-react';
import axios from 'axios';
import { AnimatePresence, motion } from 'framer-motion';
import moment from 'moment';
import type { NextPage } from 'next';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import Router, { useRouter } from 'next/router';
import { Fragment, useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { useRecoilState } from 'recoil';

type Session = {
  id: string;
  token: string;
  browser: string | null;
  os: string | null;
  device: string | null;
  ipAddress: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
  region?: string;
  country?: string;
};

function DeviceIcon({ device }: { device: string | null }) {
  if (device === 'mobile') return <IconDeviceMobile className='w-5 h-5' />;
  if (device === 'tablet') return <IconDeviceMobile className='w-5 h-5' />;
  return <IconDeviceLaptop className='w-5 h-5' />;
}

type Panel = 'sessions';

const Topbar: NextPage = () => {
  const [login, setLogin] = useRecoilState(loginState);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { discord: discordOAuth, google: googleOAuth, loading: oauthLoading } = useOAuthConfig();
  const isDiscordOAuth = discordOAuth.available;
  const isGoogleOAuth = googleOAuth.available;
  const [open, setOpen] = useState(false);
  const [panel, setPanel] = useState<Panel>('sessions');
  const [sessions, setSessions] = useState<Session[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const router = useRouter();
  const errorToastShown = useRef(false);

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  const fetchSessions = async () => {
    setSessionsLoading(true);
    try {
      const res = await axios.get('/api/user/sessions');
      setSessions(res.data.sessions || []);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await axios.delete(`/api/user/sessions/${id}`);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  const revokeAll = async () => {
    try {
      await axios.delete('/api/user/sessions');
    } catch {
      toast.error('Failed to sign out all sessions');
    }
  };

  async function logout() {
    await axios.post('/api/auth/logout');
    setLogin({
      userId: 1,
      username: '',
      displayname: '',
      canMakeWorkspace: false,
      thumbnail: '',
      workspaces: [],
      isOwner: false,
      isFirstLogin: false,
      hasPassword: false,
    });
    router.push('/login');
  }

  async function unlink() {
    const id = toast.loading('Unlinking Discord...');
    try {
      await axios.post('/api/auth/discord/unlink');
      toast.success('Discord unlinked', { id });
      setLogin((prev) => ({ ...prev, discordUser: undefined }));
    } catch {
      toast.error('Failed to unlink', { id });
    }
  }

  async function deleteAccount() {
    const id = toast.loading('Deleting account...');
    try {
      await axios.delete('/api/user/account');
      toast.success('Account deleted', { id });
      await logout();
    } catch {
      toast.error('Failed to delete account', { id });
    }
  }

  async function googleUnlink() {
    const id = toast.loading('Unlinking Google...');
    try {
      await axios.post('/api/auth/google/unlink');
      toast.success('Google unlinked', { id });
      setLogin((prev) => ({ ...prev, googleUser: undefined }));
    } catch {
      toast.error('Failed to unlink', { id });
    }
  }

  useEffect(() => {
    if (!Router.isReady || errorToastShown.current) return;

    const { action, linked, error, ...rest } = Router.query;
    if (!action && !linked && !error) return;

    const provider = Array.isArray(linked) ? linked[0] : linked;

    if (provider === 'discord' || provider === 'google') {
      toast.success(`${provider === 'discord' ? 'Discord' : 'Google'} connected`);
    } else if (action === 'linked') {
      toast.success('Account linked');
    } else if (action) {
      toast.error('Error signing in.');
    } else if (error) {
      toast.error('Something went wrong while updating your account.');
    }

    errorToastShown.current = true;
    Router.replace({ pathname: Router.pathname, query: rest }, undefined, {
      shallow: true,
    });
  }, [Router.isReady, Router.query]);

  return (
    <>
      <header className='sticky top-0 z-50 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center h-16'>
            <Link href='/'>
              <img
                src='/planetary.svg'
                className='h-8 w-32'
                alt='Planetary'
              />
            </Link>

            <div className='flex items-center gap-2'>
              <button
                onClick={toggleTheme}
                aria-label='Toggle theme'
                className='flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800'
              >
                {resolvedTheme === 'dark' ? (
                  <IconSun className='h-5 w-5' />
                ) : (
                  <IconMoon className='h-5 w-5' />
                )}
              </button>
              <Menu
                as='div'
                className='relative'
              >
                {({ open }) => (
                  <>
                    <Menu.Button
                      as={motion.button}
                      type='button'
                      whileTap={{ scale: 0.96 }}
                      aria-label='Open account dropdown'
                      className='group flex items-center gap-3 rounded-xl px-2 py-1.5 transition-colors hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-zinc-800'
                    >
                      <img
                          src={login?.thumbnail || '/default-avatar.jpg'}
                          alt={login?.displayname ?? 'Profile'}
                          className='h-9 w-9 rounded-full object-cover ring-2 ring-white transition-colors group-hover:ring-primary/30 dark:ring-zinc-800 dark:group-hover:ring-primary/40'
                        />
                        {login?.isOwner && (
                          <span className='absolute -right-0.5 -bottom-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 ring-2 ring-white dark:ring-zinc-800'>
                            <IconCrown className='h-2.5 w-2.5 text-white' />
                          </span>
                        )}
                      <span className='hidden text-sm font-medium text-zinc-800 dark:text-zinc-100 sm:block'>
                        {login?.displayname}
                      </span>
                      <motion.span
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                        className='hidden sm:block'
                      >
                        <IconChevronDown className='h-4 w-4 text-zinc-400 transition-colors group-hover:text-zinc-600 dark:group-hover:text-zinc-300' />
                      </motion.span>
                    </Menu.Button>
                    <AnimatePresence>
                      {open ? (
                        <Menu.Items
                          as={motion.div}
                          static
                          initial={{ opacity: 0, y: -8, scale: 0.96 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: -6, scale: 0.97 }}
                          transition={{ type: 'spring', stiffness: 420, damping: 30, mass: 0.7 }}
                          className='absolute right-0 z-50 mt-4 w-64 origin-top-right overflow-hidden rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl shadow-black/5 dark:border-zinc-800 dark:bg-zinc-900 dark:shadow-black/30'
                        >
                          <div className='px-3 py-2'>
                            <p className='truncate text-sm font-semibold text-zinc-900 dark:text-white'>
                              {login?.displayname}
                            </p>
                            <p className='truncate text-xs text-zinc-500'>@{login?.username}</p>
                          </div>

                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={() => router.push('/settings')}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                                  active ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                                }`}
                              >
                                <IconSettings className='h-4 w-4' />
                                Account Settings
                              </button>
                            )}
                          </Menu.Item>

                          <Menu.Item>
                            <button
                              onClick={() => {
                                setPanel('sessions');
                                setOpen(true);
                                fetchSessions();
                              }}
                              className='flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors'
                            >
                              <IconDevices className='h-4 w-4' />
                              Sessions
                            </button>
                          </Menu.Item>
                          {(isDiscordOAuth || isGoogleOAuth) && (
                            <>
                              <div className='my-2 h-px bg-zinc-200 dark:bg-zinc-700' />
                              {isDiscordOAuth && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={
                                        login.discordUser
                                          ? unlink
                                          : () =>
                                              (window.location.href =
                                                '/api/auth/discord/start?link=1')
                                      }
                                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                                        active ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                                      }`}
                                    >
                                      <img
                                        src='/discord.svg'
                                        className='h-4 w-4 invert dark:invert-0'
                                        alt=''
                                      />
                                      {login.discordUser ? 'Unlink Discord' : 'Link Discord'}
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                              {isGoogleOAuth && (
                                <Menu.Item>
                                  {({ active }) => (
                                    <button
                                      onClick={
                                        login.googleUser
                                          ? googleUnlink
                                          : () =>
                                              (window.location.href =
                                                '/api/auth/google/start?link=1')
                                      }
                                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                                        active ? 'bg-zinc-100 dark:bg-zinc-800' : ''
                                      }`}
                                    >
                                      <img
                                        src='/google.svg'
                                        className='h-4 w-4 invert dark:invert-0'
                                        alt=''
                                      />
                                      {login.googleUser ? 'Unlink Google' : 'Link Google'}
                                    </button>
                                  )}
                                </Menu.Item>
                              )}
                            </>
                          )}
                          <div className='my-2 h-px bg-zinc-200 dark:bg-zinc-700' />
                          <Menu.Item>
                            {({ active }) => (
                              <button
                                onClick={logout}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 ${
                                  active ? 'bg-red-50 dark:bg-red-500/10' : ''
                                }`}
                              >
                                <IconLogout className='h-4 w-4' />
                                Logout
                              </button>
                            )}
                          </Menu.Item>
                          {!login.canMakeWorkspace && (
                            <>
                              <div className='my-2 h-px bg-zinc-200 dark:bg-zinc-700' />

                              <Menu.Item>
                                {({ active }) => (
                                  <button
                                    onClick={deleteAccount}
                                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-red-500 ${
                                      active ? 'bg-red-50 dark:bg-red-500/10' : ''
                                    }`}
                                  >
                                    <IconTrash className='h-4 w-4' />
                                    Delete Account
                                  </button>
                                )}
                              </Menu.Item>
                            </>
                          )}
                        </Menu.Items>
                      ) : null}
                    </AnimatePresence>
                  </>
                )}
              </Menu>
            </div>
          </div>
        </div>
      </header>

      <Transition
        show={open}
        as={Fragment}
      >
        <Dialog
          onClose={() => setOpen(false)}
          className='relative z-50'
        >
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-200'
            enterFrom='opacity-0'
            enterTo='opacity-100'
            leave='ease-in duration-150'
            leaveFrom='opacity-100'
            leaveTo='opacity-0'
          >
            <div className='fixed inset-0 bg-black/20 dark:bg-black/40 backdrop-blur-[2px]' />
          </Transition.Child>

          <div className='fixed inset-0 flex items-center justify-center p-4'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-200'
              enterFrom='opacity-0 translate-y-1 scale-95'
              enterTo='opacity-100 translate-y-0 scale-100'
              leave='ease-in duration-150'
              leaveFrom='opacity-100 translate-y-0 scale-100'
              leaveTo='opacity-0 translate-y-1 scale-95'
            >
              <Dialog.Panel className='w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl shadow-zinc-900/20 transition-all dark:bg-zinc-900'>
                {panel === 'sessions' && (
                  <>
                    <div className='flex items-center gap-2 px-4 py-3.5'>
                      <button
                        onClick={() => setOpen(false)}
                        className='rounded-lg p-1 text-zinc-500 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      >
                        <IconX className='h-4 w-4' />
                      </button>
                      <p className='flex-1 text-sm font-semibold text-zinc-900 dark:text-white'>
                        Active sessions
                      </p>
                      <button
                        onClick={fetchSessions}
                        className='rounded-lg p-1 text-zinc-400 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      >
                        <IconRefresh className='h-4 w-4' />
                      </button>
                      <button
                        onClick={revokeAll}
                        className='rounded-lg px-2 py-1 text-xs font-medium text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-500/10'
                      >
                        Sign out all
                      </button>
                    </div>

                    <div className='max-h-72 overflow-y-auto'>
                      {sessionsLoading ? (
                        <div className='flex items-center justify-center py-10'>
                          <div className='h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-primary dark:border-zinc-700' />
                        </div>
                      ) : sessions.length === 0 ? (
                        <p className='py-10 text-center text-sm text-zinc-400 dark:text-zinc-500'>
                          No sessions found
                        </p>
                      ) : (
                        <div className='divide-y divide-zinc-100 px-4 dark:divide-zinc-800/80'>
                          {sessions.map((s) => (
                            <div
                              key={s.id}
                              className='flex items-center gap-3 py-3'
                            >
                              <div
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${s.isCurrent ? 'bg-primary/10 text-primary' : 'bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-500'}`}
                              >
                                <DeviceIcon device={s.device} />
                              </div>
                              <div className='min-w-0 flex-1'>
                                <div className='flex items-center gap-1.5'>
                                  <p className='truncate text-sm font-medium text-zinc-900 dark:text-white'>
                                    {s.browser || 'Unknown'} on {s.os || 'Unknown'}
                                  </p>
                                  {s.isCurrent && (
                                    <span className='shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400'>
                                      Current
                                    </span>
                                  )}
                                </div>
                                <p className='truncate text-xs text-zinc-400 dark:text-zinc-500'>
                                  {[s.region, s.country].filter(Boolean).join(', ') ||
                                    `${s.ipAddress} · ${moment(s.createdAt).fromNow()}`}
                                </p>
                              </div>
                              {!s.isCurrent && (
                                <button
                                  onClick={() => revokeSession(s.id)}
                                  className='shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10'
                                >
                                  <IconTrash className='h-3.5 w-3.5' />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default Topbar;

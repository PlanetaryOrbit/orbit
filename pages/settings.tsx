'use client';

import ConnectionsPanel from '@/components/account/connections-panel';
import PreferencesPanel from '@/components/account/preferences-panel';
import ProfilePanel from '@/components/account/profile-panel';
import SecurityPanel from '@/components/account/security-panel';
import {
  ACCOUNT_PREFERENCES_KEY,
  applyAccountPreferences,
  isAccountTab,
  readAccountPreferences,
  type AccountPreferences,
  type AccountSession,
  type AccountTab,
  type ProviderKey,
} from '@/components/account/types';
import Topbar from '@/components/topbar';
import {
  workspacesModalPanelClass,
  workspacesSecondaryButtonClass,
  WorkspacesPageHeader,
  WorkspacesPageShell,
} from '@/components/workspaces/shell';
import { useOAuthConfig } from '@/hooks/useOAuthConfig';
import { loginState, type LoginState } from '@/state';
import { Dialog, Transition } from '@headlessui/react';
import { IconAdjustments, IconLink, IconShield, IconUser, IconX } from '@tabler/icons-react';
import axios from 'axios';
import clsx from 'clsx';
import type { NextPage } from 'next';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useRecoilState } from 'recoil';

const TABS = [
  {
    key: 'profile',
    label: 'Profile',
    description: 'Your Roblox identity and synced details.',
    icon: IconUser,
  },
  {
    key: 'connections',
    label: 'Connections',
    description: 'External accounts you can use to sign in.',
    icon: IconLink,
  },
  {
    key: 'security',
    label: 'Security',
    description: 'Password, active sessions, and account access.',
    icon: IconShield,
  },
  {
    key: 'preferences',
    label: 'Preferences',
    description: 'Theme and interface options for this device.',
    icon: IconAdjustments,
  },
] as const;

const PROVIDER_LABELS: Record<ProviderKey, string> = {
  discord: 'Discord',
  google: 'Google',
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function friendlyError(code: string): string {
  const messages: Record<string, string> = {
    auth_required: 'Sign in before linking an account.',
    session_mismatch: 'Your session expired. Please try connecting again.',
    already_linked: 'That account is already linked to a different Orbit account.',
    unauthorized_domain: 'That Google account uses an unapproved email domain.',
    config_error: 'This sign-in provider is not configured correctly.',
    oauth_failed: 'The provider could not complete the connection.',
    'unauthorized-domain': 'That Google account uses an unapproved email domain.',
    'link-fail': 'The provider could not complete the connection.',
  };

  return messages[code] ?? 'Something went wrong while updating your account.';
}

const EMPTY_LOGIN: LoginState = {
  userId: 1,
  username: '',
  displayname: '',
  thumbnail: '',
  canMakeWorkspace: false,
  workspaces: [],
  isOwner: false,
  isFirstLogin: false,
  hasPassword: false,
  discordUser: null,
  googleUser: null,
};

const AccountSettings: NextPage = () => {
  const [login, setLogin] = useRecoilState(loginState);
  const router = useRouter();
  const oauthConfig = useOAuthConfig();

  const [tab, setTab] = useState<AccountTab>('profile');
  const [sessions, setSessions] = useState<AccountSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [preferences, setPreferences] = useState<AccountPreferences>({
    reduceMotion: false,
    compact: false,
  });
  const [pendingUnlink, setPendingUnlink] = useState<ProviderKey | null>(null);
  const [unlinking, setUnlinking] = useState(false);
  const handledQuery = useRef(false);

  const activeTab = TABS.find((item) => item.key === tab) ?? TABS[0];

  const fetchSessions = useCallback(async () => {
    setSessionsLoading(true);
    try {
      const { data } = await axios.get<{ sessions: AccountSession[] }>('/api/user/sessions');
      setSessions(data.sessions ?? []);
    } catch {
      toast.error('Failed to load active sessions');
    } finally {
      setSessionsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  useEffect(() => {
    const saved = readAccountPreferences();
    setPreferences(saved);
    applyAccountPreferences(saved);

    const syncFromStorage = (event: StorageEvent) => {
      if (event.key !== ACCOUNT_PREFERENCES_KEY) return;
      const next = readAccountPreferences();
      setPreferences(next);
      applyAccountPreferences(next);
    };

    window.addEventListener('storage', syncFromStorage);
    return () => window.removeEventListener('storage', syncFromStorage);
  }, []);

  useEffect(() => {
    const requested = firstValue(router.query.tab);
    if (isAccountTab(requested)) setTab(requested);
  }, [router.query.tab]);

  useEffect(() => {
    if (!router.isReady || handledQuery.current) return;

    const linked = firstValue(router.query.linked);
    const action = firstValue(router.query.action);
    const error = firstValue(router.query.error);

    if (!linked && !action && !error) return;

    handledQuery.current = true;

    if (linked && linked in PROVIDER_LABELS) {
      toast.success(`${PROVIDER_LABELS[linked as ProviderKey]} connected`);
    } else if (action === 'linked') {
      toast.success('Account linked');
    } else if (action) {
      toast.error('Error signing in.');
    } else if (error) {
      toast.error(friendlyError(error));
    }

    const {
      tab: queryTab,
      linked: _linked,
      action: _action,
      error: _error,
      ...rest
    } = router.query;
    const requestedTab = isAccountTab(firstValue(queryTab)) ? firstValue(queryTab)! : tab;

    void router.replace(
      { pathname: '/settings', query: { ...rest, tab: requestedTab } },
      undefined,
      {
        shallow: true,
      },
    );
  }, [router, tab]);

  const changeTab = (next: AccountTab) => {
    setTab(next);
    void router.replace({ pathname: '/settings', query: { tab: next } }, undefined, {
      shallow: true,
    });
  };

  const updatePreferences = (next: AccountPreferences) => {
    setPreferences(next);
    applyAccountPreferences(next);

    try {
      window.localStorage.setItem(ACCOUNT_PREFERENCES_KEY, JSON.stringify(next));
    } catch {
      // Storage may be unavailable in private browsing; preferences still apply for this session.
    }
  };

  const connectProvider = (provider: ProviderKey) => {
    window.location.href = `/api/auth/${provider}/start?link=1`;
  };

  const disconnectProvider = async () => {
    if (!pendingUnlink || unlinking) return;

    const provider = pendingUnlink;
    setUnlinking(true);
    const id = toast.loading(`Disconnecting ${PROVIDER_LABELS[provider]}…`);

    try {
      await axios.post(`/api/auth/${provider}/unlink`);

      setLogin((previous) =>
        provider === 'discord'
          ? { ...previous, discordUser: null }
          : { ...previous, googleUser: null },
      );
      toast.success(`${PROVIDER_LABELS[provider]} disconnected`, { id });
      setPendingUnlink(null);
    } catch {
      toast.error(`Failed to disconnect ${PROVIDER_LABELS[provider]}`, { id });
    } finally {
      setUnlinking(false);
    }
  };

  const refreshProfile = async () => {
    setRefreshing(true);
    try {
      await axios.post('/api/user/profile/refresh');
      const { data } = await axios.get('/api/@me');

      setLogin({
        ...data.user,
        hasPassword: data.user?.hasPassword ?? login.hasPassword ?? false,
        workspaces: data.workspaces ?? [],
      });
      toast.success('Roblox profile synced');
    } catch {
      toast.error('Failed to sync Roblox profile');
    } finally {
      setRefreshing(false);
    }
  };

  const savePassword = async (currentPassword: string, newPassword: string): Promise<boolean> => {
    const id = toast.loading('Updating password…');
    try {
      await axios.post('/api/user/password', { currentPassword, newPassword });
      setLogin((previous) => ({ ...previous, hasPassword: true }));
      toast.success('Password updated', { id });
      return true;
    } catch (error: any) {
      toast.error(error?.response?.data?.error ?? 'Failed to update password', { id });
      return false;
    }
  };

  const revokeSession = async (id: string) => {
    try {
      await axios.delete(`/api/user/sessions/${id}`);
      setSessions((previous) => previous.filter((session) => session.id !== id));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  const revokeOtherSessions = async () => {
    try {
      await axios.delete('/api/user/sessions');
      setSessions((previous) => previous.filter((session) => session.isCurrent));
      toast.success('Signed out other devices');
    } catch {
      toast.error('Failed to sign out other devices');
    }
  };

  const deleteAccount = async () => {
    try {
      await axios.delete('/api/user/account');
      setLogin(EMPTY_LOGIN);
      toast.success('Account deleted');
      await router.replace('/login');
    } catch {
      toast.error('Failed to delete account');
    }
  };

  const renderContent = () => {
    switch (tab) {
      case 'connections':
        return (
          <ConnectionsPanel
            login={login}
            oauthConfig={oauthConfig}
            onConnect={connectProvider}
            onDisconnect={setPendingUnlink}
          />
        );
      case 'security':
        return (
          <SecurityPanel
            login={login}
            sessions={sessions}
            sessionsLoading={sessionsLoading}
            onRefreshSessions={fetchSessions}
            onRevokeSession={revokeSession}
            onRevokeAll={revokeOtherSessions}
            onSavePassword={savePassword}
            onDeleteAccount={deleteAccount}
          />
        );
      case 'preferences':
        return (
          <PreferencesPanel
            preferences={preferences}
            onChange={updatePreferences}
          />
        );
      case 'profile':
      default:
        return (
          <ProfilePanel
            login={login}
            refreshing={refreshing}
            onRefresh={refreshProfile}
            sessionsCount={sessions.length}
          />
        );
    }
  };

  return (
    <>
      <Head>
        <title>Account settings · Orbit</title>
      </Head>

      <div className='min-h-screen bg-zinc-50 dark:bg-zinc-950'>
        <Topbar />

        <WorkspacesPageShell>
          <WorkspacesPageHeader
            title='Account settings'
            subtitle='Manage your Roblox identity, connected accounts, security, and preferences.'
          />

          <div className='flex flex-col gap-8 lg:flex-row'>
            <div className='w-full flex-shrink-0 lg:w-48'>
              <nav className='space-y-0.5'>
                {TABS.map(({ key, label, icon: Icon }) => {
                  const isActive = tab === key;

                  return (
                    <button
                      key={key}
                      type='button'
                      onClick={() => changeTab(key)}
                      className={clsx(
                        'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition-colors',
                        isActive
                          ? 'bg-zinc-100 font-medium text-zinc-900 dark:bg-zinc-800/80 dark:text-zinc-100'
                          : 'text-zinc-500 hover:bg-zinc-100/70 hover:text-zinc-700 dark:text-zinc-400 dark:hover:bg-zinc-800/40 dark:hover:text-zinc-200',
                      )}
                    >
                      <Icon
                        className='h-4 w-4'
                        stroke={isActive ? 2.2 : 1.75}
                      />
                      <span>{label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className='min-w-0 flex-1'>
              <div className='mb-5'>
                <h2 className='text-base font-semibold text-zinc-900 dark:text-zinc-100'>
                  {activeTab.label}
                </h2>
                <p className='mt-0.5 text-sm text-zinc-400 dark:text-zinc-500'>
                  {activeTab.description}
                </p>
              </div>

              {renderContent()}
            </div>
          </div>
        </WorkspacesPageShell>
      </div>

      <Transition
        show={Boolean(pendingUnlink)}
        as={Fragment}
      >
        <Dialog
          onClose={() => !unlinking && setPendingUnlink(null)}
          className='relative z-[60]'
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
            <div className='fixed inset-0 bg-black/40' />
          </Transition.Child>

          <div className='fixed inset-0 flex items-center justify-center p-4'>
            <Transition.Child
              as={Fragment}
              enter='ease-out duration-200'
              enterFrom='opacity-0 translate-y-1'
              enterTo='opacity-100 translate-y-0'
              leave='ease-in duration-150'
              leaveFrom='opacity-100 translate-y-0'
              leaveTo='opacity-0 translate-y-1'
            >
              <Dialog.Panel className={workspacesModalPanelClass}>
                <div className='border-b border-zinc-100 px-5 py-4 dark:border-zinc-800'>
                  <Dialog.Title className='text-sm font-semibold text-zinc-900 dark:text-white'>
                    Disconnect {pendingUnlink ? PROVIDER_LABELS[pendingUnlink] : 'account'}?
                  </Dialog.Title>
                  <Dialog.Description className='mt-1 text-xs text-zinc-500 dark:text-zinc-400'>
                    You can connect it again at any time. Your Roblox account will stay linked.
                  </Dialog.Description>
                </div>

                <div className='flex justify-end gap-2 px-5 py-4'>
                  <button
                    type='button'
                    onClick={() => setPendingUnlink(null)}
                    className={workspacesSecondaryButtonClass}
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    disabled={unlinking}
                    onClick={disconnectProvider}
                    className='inline-flex items-center rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-50'
                  >
                    {unlinking ? 'Disconnecting…' : 'Disconnect'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};

export default AccountSettings;

import type { LoginState } from '@/state';
import {
  IconDeviceDesktop,
  IconDeviceMobile,
  IconEye,
  IconEyeOff,
  IconKey,
  IconRefresh,
  IconShield,
  IconTrash,
} from '@tabler/icons-react';
import clsx from 'clsx';
import moment from 'moment';
import { useState, type FormEvent } from 'react';
import toast from 'react-hot-toast';

import {
  AccountPanel,
  AccountPanelHeader,
  accountDangerButtonClass,
  accountInputClass,
  accountPrimaryButtonClass,
  accountSecondaryButtonClass,
} from './shell';
import type { AccountSession } from './types';

type SecurityPanelProps = {
  login: LoginState;
  sessions: AccountSession[];
  sessionsLoading: boolean;
  onRefreshSessions: () => void;
  onRevokeSession: (id: string) => void;
  onRevokeAll: () => void;
  onSavePassword: (currentPassword: string, newPassword: string) => Promise<boolean>;
  onDeleteAccount: () => Promise<void>;
};

function SessionIcon({ device }: { device: string | null }) {
  if (device === 'mobile') return <IconDeviceMobile className='h-4 w-4' />;
  if (device === 'tablet') return <IconDeviceMobile className='h-4 w-4' />;
  return <IconDeviceDesktop className='h-4 w-4' />;
}

export default function SecurityPanel({
  login,
  sessions,
  sessionsLoading,
  onRefreshSessions,
  onRevokeSession,
  onRevokeAll,
  onSavePassword,
  onDeleteAccount,
}: SecurityPanelProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const hasPassword = Boolean(login.hasPassword);

  const submitPassword = async (event: FormEvent) => {
    event.preventDefault();

    if (newPassword.length < 8) {
      toast.error('New password must be at least 8 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSavingPassword(true);
    try {
      const saved = await onSavePassword(currentPassword, newPassword);
      if (saved) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const confirmDelete = async () => {
    if (deleteText !== 'DELETE') return;

    setDeleting(true);
    try {
      await onDeleteAccount();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className='space-y-5'>
      <AccountPanel>
        <AccountPanelHeader
          title='Password'
          description={
            hasPassword
              ? 'Update the password you use to sign in alongside Roblox.'
              : 'Add a password as a backup sign-in method for your account.'
          }
          action={
            <span className='rounded-md bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300'>
              {hasPassword ? 'Password set' : 'Not set'}
            </span>
          }
        />

        <form
          onSubmit={submitPassword}
          className='space-y-4 p-5 sm:px-6'
        >
          {hasPassword && (
            <label className='block space-y-1.5'>
              <span className='text-xs font-medium text-zinc-600 dark:text-zinc-300'>
                Current password
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                autoComplete='current-password'
                placeholder='••••••••'
                className={accountInputClass}
              />
            </label>
          )}

          <div className='grid gap-4 sm:grid-cols-2'>
            <label className='block space-y-1.5'>
              <span className='text-xs font-medium text-zinc-600 dark:text-zinc-300'>
                New password
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                autoComplete='new-password'
                placeholder='At least 8 characters'
                className={accountInputClass}
              />
            </label>

            <label className='block space-y-1.5'>
              <span className='text-xs font-medium text-zinc-600 dark:text-zinc-300'>
                Confirm new password
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                autoComplete='new-password'
                placeholder='Repeat new password'
                className={accountInputClass}
              />
            </label>
          </div>

          <div className='flex flex-wrap items-center justify-between gap-3'>
            <button
              type='button'
              onClick={() => setShowPassword((value) => !value)}
              className='inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 transition hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200'
            >
              {showPassword ? (
                <IconEyeOff
                  className='h-4 w-4'
                  stroke={1.8}
                />
              ) : (
                <IconEye
                  className='h-4 w-4'
                  stroke={1.8}
                />
              )}
              {showPassword ? 'Hide passwords' : 'Show passwords'}
            </button>

            <button
              type='submit'
              disabled={savingPassword || !newPassword || !confirmPassword}
              className={accountPrimaryButtonClass}
            >
              <IconKey
                className='h-4 w-4'
                stroke={1.8}
              />
              {savingPassword ? 'Saving…' : hasPassword ? 'Update password' : 'Set password'}
            </button>
          </div>
        </form>
      </AccountPanel>

      <AccountPanel>
        <AccountPanelHeader
          title='Active sessions'
          description='Devices currently signed in to your Orbit account.'
          action={
            <div className='flex items-center gap-2'>
              <button
                type='button'
                onClick={onRefreshSessions}
                className='rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200'
                aria-label='Refresh sessions'
              >
                <IconRefresh
                  className={sessionsLoading ? 'h-4 w-4 animate-spin' : 'h-4 w-4'}
                  stroke={1.8}
                />
              </button>
              <button
                type='button'
                onClick={onRevokeAll}
                disabled={sessions.length <= 1}
                className={accountSecondaryButtonClass}
              >
                Sign out others
              </button>
            </div>
          }
        />

        <div className='divide-y divide-zinc-100 px-5 dark:divide-zinc-800/80 sm:px-6'>
          {sessionsLoading ? (
            <div className='flex items-center justify-center py-10'>
              <div className='h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-[color:rgb(var(--group-theme))] dark:border-zinc-700' />
            </div>
          ) : sessions.length === 0 ? (
            <div className='py-10 text-center text-sm text-zinc-400 dark:text-zinc-500'>
              No active sessions found.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                className='flex flex-wrap items-center gap-3 py-3.5'
              >
                <div className='flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400'>
                  <SessionIcon device={session.device} />
                </div>

                <div className='min-w-0 flex-1'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <p className='text-sm font-medium text-zinc-900 dark:text-white'>
                      {session.browser || 'Unknown browser'} · {session.os || 'Unknown OS'}
                    </p>
                    {session.isCurrent && (
                      <span className='rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400'>
                        This device
                      </span>
                    )}
                  </div>
                  <p className='mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400'>
                    {[session.region, session.country].filter(Boolean).join(', ') ||
                      session.ipAddress ||
                      'Unknown location'}{' '}
                    · {moment(session.createdAt).fromNow()}
                  </p>
                </div>

                {!session.isCurrent && (
                  <button
                    type='button'
                    onClick={() => onRevokeSession(session.id)}
                    className='rounded-lg p-2 text-zinc-400 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10 dark:hover:text-red-400'
                    aria-label='Revoke session'
                  >
                    <IconTrash
                      className='h-4 w-4'
                      stroke={1.8}
                    />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </AccountPanel>

      {!login.canMakeWorkspace && (
        <AccountPanel>
          <AccountPanelHeader
            title='Danger zone'
            description='These actions cannot be undone.'
          />
          <div className='space-y-4 p-5 sm:px-6'>
            <div className='rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/40'>
              <p className='text-sm font-semibold text-red-700 dark:text-red-400'>
                Delete your account
              </p>
              <p className='mt-1 text-xs text-red-600/80 dark:text-red-300/70'>
                Permanently removes your profile, links, sessions, and workspace membership data.
              </p>
              <div className='mt-4 flex flex-col gap-3 sm:flex-row'>
                <input
                  value={deleteText}
                  onChange={(event) => setDeleteText(event.target.value)}
                  placeholder='Type DELETE to confirm'
                  className={clsx(accountInputClass, 'sm:max-w-xs')}
                />
                <button
                  type='button'
                  disabled={deleteText !== 'DELETE' || deleting}
                  onClick={confirmDelete}
                  className={accountDangerButtonClass}
                >
                  {deleting ? 'Deleting…' : 'Delete account'}
                </button>
              </div>
            </div>
          </div>
        </AccountPanel>
      )}

      <div className='flex items-start gap-2 px-1 text-xs text-zinc-500 dark:text-zinc-400'>
        <IconShield
          className='mt-0.5 h-4 w-4 shrink-0'
          stroke={1.8}
        />
        Account changes are protected by your session and request origin checks.
      </div>
    </div>
  );
}

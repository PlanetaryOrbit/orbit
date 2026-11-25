import Modal from '@/components/Modal';
import { useSessions } from '@/hooks/useSessions';
import { useEffect } from 'react';

import SessionRow from './SessionRow';

type SessionsDialogProps = {
  open: boolean;
  onClose: () => void;
};

const footerButtonClass =
  'rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-40';

export default function SessionsDialog({ open, onClose }: SessionsDialogProps) {
  const { sessions, loading, refresh, revoke, revokeOthers } = useSessions();
  const hasOtherSessions = sessions.some((session) => !session.isCurrent);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title='Active sessions'
      description='Devices signed in to your account.'
      footer={
        <div className='flex items-center justify-between'>
          <button
            type='button'
            onClick={refresh}
            className={`${footerButtonClass} text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-white/5`}
          >
            Refresh
          </button>
          <button
            type='button'
            onClick={revokeOthers}
            disabled={!hasOtherSessions}
            className={`${footerButtonClass} text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10`}
          >
            Sign out other sessions
          </button>
        </div>
      }
    >
      {loading ? (
        <div className='flex justify-center py-12'>
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-primary dark:border-zinc-700' />
        </div>
      ) : sessions.length === 0 ? (
        <p className='py-12 text-center text-sm text-zinc-400 dark:text-zinc-500'>
          No sessions found
        </p>
      ) : (
        <ul className='divide-y divide-zinc-100 dark:divide-white/5'>
          {sessions.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              onRevoke={revoke}
            />
          ))}
        </ul>
      )}
    </Modal>
  );
}

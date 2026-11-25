import type { Session } from '@/hooks/useSessions';
import {
  IconDeviceLaptop,
  IconDeviceMobile,
  IconDeviceTablet,
  IconTrash,
} from '@tabler/icons-react';
import clsx from 'clsx';
import moment from 'moment';

const DEVICE_ICONS = {
  mobile: IconDeviceMobile,
  tablet: IconDeviceTablet,
};

type SessionRowProps = {
  session: Session;
  onRevoke: (id: string) => void;
};

function describeSession({ region, country, ipAddress, createdAt }: Session) {
  const place = [region, country].filter(Boolean).join(', ') || ipAddress;
  return [place, moment(createdAt).fromNow()].filter(Boolean).join(' · ');
}

export default function SessionRow({ session, onRevoke }: SessionRowProps) {
  const DeviceIcon = DEVICE_ICONS[session.device as keyof typeof DEVICE_ICONS] ?? IconDeviceLaptop;

  return (
    <li className='flex items-center gap-3 py-3'>
      <span
        className={clsx(
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
          session.isCurrent
            ? 'bg-primary/10 text-primary'
            : 'bg-zinc-100 text-zinc-400 dark:bg-white/5 dark:text-zinc-500',
        )}
      >
        <DeviceIcon
          className='h-[18px] w-[18px]'
          stroke={1.75}
        />
      </span>

      <div className='min-w-0 flex-1'>
        <div className='flex items-center gap-2'>
          <p className='truncate text-sm font-medium text-zinc-900 dark:text-white'>
            {session.browser || 'Unknown'} on {session.os || 'Unknown'}
          </p>
          {session.isCurrent && (
            <span className='shrink-0 rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400'>
              Current
            </span>
          )}
        </div>
        <p className='truncate text-xs text-zinc-400 dark:text-zinc-500'>
          {describeSession(session)}
        </p>
      </div>

      {!session.isCurrent && (
        <button
          type='button'
          onClick={() => onRevoke(session.id)}
          aria-label='Revoke session'
          className='shrink-0 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10'
        >
          <IconTrash
            className='h-4 w-4'
            stroke={1.75}
          />
        </button>
      )}
    </li>
  );
}

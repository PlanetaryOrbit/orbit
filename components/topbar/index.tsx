import ThemeToggle from '@/components/ThemeToggle';
import { useAccountLinkToast } from '@/hooks/useAccountLinkToast';
import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

import AccountMenu from './AccountMenu';
import SessionsDialog from './SessionsDialog';

export default function Topbar() {
  const [sessionsOpen, setSessionsOpen] = useState(false);

  useAccountLinkToast();

  return (
    <>
      <header className='sticky top-0 z-50 border-b border-zinc-200/70 bg-white/75 backdrop-blur-xl dark:border-white/5 dark:bg-zinc-950/70'>
        <div className='mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8'>
          <Link
            href='/'
            aria-label='Home'
            className='rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
          >
            <Image
              src='/planetary.svg'
              alt='Planetary'
              width={454}
              height={85}
              priority
              className='h-6 w-auto'
            />
          </Link>

          <div className='flex items-center gap-3'>
            <ThemeToggle />
            <AccountMenu onOpenSessions={() => setSessionsOpen(true)} />
          </div>
        </div>
      </header>

      <SessionsDialog
        open={sessionsOpen}
        onClose={() => setSessionsOpen(false)}
      />
    </>
  );
}

import Modal from '@/components/Modal';
import { LICENSE_URL } from '@/utils/links';

type LicensingDialogProps = {
  open: boolean;
  onClose: () => void;
};

export default function LicensingDialog({ open, onClose }: LicensingDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title='Copyright & Licensing'
    >
      <div className='divide-y divide-zinc-100 dark:divide-white/5'>
        <section className='pb-5'>
          <div className='flex items-start justify-between gap-4'>
            <div>
              <h3 className='text-sm font-semibold text-zinc-900 dark:text-white'>Orbit</h3>
              <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>
                © 2025–2026 Planetary
              </p>
            </div>
            <span
              aria-label='Licensed under GPL version 3'
              className='rounded-md bg-zinc-100 px-2 py-1 text-[11px] font-medium text-zinc-600 dark:bg-white/5 dark:text-zinc-300'
            >
              GPL-3.0
            </span>
          </div>

          <p className='mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400'>
            Orbit is free and open-source software licensed under the GNU General Public License
            v3.0.
          </p>

          <a
            href={LICENSE_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='mt-3 inline-flex rounded-md text-sm font-medium text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40'
          >
            View license
            <span className='sr-only'> (opens in a new tab)</span>
          </a>
        </section>

        <section className='py-5'>
          <h3 className='text-sm font-semibold text-zinc-900 dark:text-white'>
            Original Tovy Project
          </h3>
          <p className='mt-0.5 text-xs text-zinc-500 dark:text-zinc-400'>© 2023 Tovy</p>
          <p className='mt-3 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400'>
            Orbit is based on the original Tovy project. Portions of the project retain their
            original copyright notices.
          </p>
        </section>

        <p className='pt-5 text-xs leading-relaxed text-zinc-400 dark:text-zinc-500'>
          Copyright notices and license information for third-party software used by Orbit may be
          included in the project repository.
        </p>
      </div>
    </Modal>
  );
}

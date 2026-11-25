import Modal from '@/components/Modal';

import { parseChange } from './changelog';
import type { ChangelogRelease } from './changelog';

type ChangelogDialogProps = {
  open: boolean;
  onClose: () => void;
  releases: ChangelogRelease[];
  loading: boolean;
};

function ChangeItem({ change }: { change: string }) {
  const { category, text } = parseChange(change);

  return (
    <li className='flex items-start gap-3'>
      {category ? (
        <span
          className={`mt-0.5 inline-flex w-[4.5rem] shrink-0 justify-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tracking-wide uppercase ${category.badge}`}
        >
          {category.label}
        </span>
      ) : (
        <span
          aria-hidden
          className='mt-2 ml-8 h-1 w-1 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-600'
        />
      )}
      <span className='min-w-0 text-sm leading-relaxed text-zinc-600 dark:text-zinc-300'>
        {text}
      </span>
    </li>
  );
}

export default function ChangelogDialog({
  open,
  onClose,
  releases,
  loading,
}: ChangelogDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title='Changelog'
      description='Recent Orbit releases'
      size='lg'
    >
      {loading ? (
        <div
          role='status'
          className='flex justify-center py-12'
        >
          <div className='h-5 w-5 animate-spin rounded-full border-2 border-zinc-200 border-t-primary dark:border-zinc-700' />
        </div>
      ) : releases.length === 0 ? (
        <p className='py-12 text-center text-sm text-zinc-400 dark:text-zinc-500'>
          No changelog entries are available.
        </p>
      ) : (
        <div className='divide-y divide-zinc-100 dark:divide-white/5'>
          {releases.map((release) => (
            <article
              key={`${release.version}-${release.date}`}
              className='py-5 first:pt-1 last:pb-0'
            >
              <header className='flex items-baseline justify-between gap-3'>
                <h3 className='text-sm font-semibold text-zinc-900 dark:text-white'>
                  {release.version}
                </h3>
                <time
                  dateTime={release.date}
                  className='text-xs text-zinc-400 dark:text-zinc-500'
                >
                  {release.date}
                </time>
              </header>

              <ul className='mt-3 space-y-2'>
                {release.changes.map((change, index) => (
                  <ChangeItem
                    key={`${release.version}-${index}`}
                    change={change}
                  />
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </Modal>
  );
}

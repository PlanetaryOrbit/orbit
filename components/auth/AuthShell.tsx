import { useHelp } from '@/components/help/HelpProvider';
import ThemeToggle from '@/components/ThemeToggle';
import packageInfo from '@/package.json';
import { getContrastColorFromRgb } from '@/utils/color';
import clsx from 'clsx';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import type { CSSProperties, ReactNode } from 'react';

import AnimatedHeight from './AnimatedHeight';
import { FOOTER_LINKS } from './constants';

const logoMask = 'url(/loading-logo.svg) center / contain no-repeat';
const ON_ACCENT_LUMINANCE_THRESHOLD = 0.4;
const DEFAULT_HEADLINE = 'Staff management, without the headache.';

type Background = {
  url: string;
  tint: number;
};

type Progress = {
  current: number;
  total: number;
};

function Mark({ className }: { className: string }) {
  return (
    <span
      aria-hidden
      className={className}
      style={{ mask: logoMask, WebkitMask: logoMask }}
    />
  );
}

type ShowcaseProps = {
  headline: string;
  description: string;
  background?: Background | null;
};

function Showcase({ headline, description, background }: ShowcaseProps) {
  return (
    <aside
      style={background ? { backgroundImage: `url(${JSON.stringify(background.url)})` } : undefined}
      className={clsx(
        'relative flex h-24 items-center overflow-hidden px-6 transition-colors duration-500 lg:h-auto lg:min-h-screen lg:flex-col lg:items-stretch lg:justify-between lg:p-14',
        background
          ? 'bg-zinc-950 bg-cover bg-center text-white'
          : 'bg-primary text-[color:var(--on-primary)]',
      )}
    >
      {background ? (
        <>
          <div
            aria-hidden
            className='absolute inset-0 bg-zinc-950'
            style={{ opacity: background.tint }}
          />
          <div
            aria-hidden
            className='absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20'
          />
        </>
      ) : (
        <>
          <div
            aria-hidden
            className='absolute inset-0 bg-gradient-to-br from-white/25 via-transparent to-black/35'
          />
          <Mark className='absolute -bottom-40 -left-36 hidden h-[46rem] w-[46rem] bg-current opacity-[0.12] lg:block' />
        </>
      )}

      <div className='relative flex items-center gap-3'>
        <Mark className='h-8 w-8 bg-current' />
        <span className='text-xl font-semibold tracking-tight'>Orbit</span>
      </div>

      <div className='relative hidden lg:block'>
        <h1 className='max-w-lg text-5xl font-semibold leading-[1.05] tracking-tight xl:text-6xl'>
          {headline}
        </h1>
        <p className='mt-6 max-w-sm text-base leading-relaxed opacity-75'>{description}</p>
      </div>
    </aside>
  );
}

function ProgressBar({ current, total }: Progress) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      role='progressbar'
      aria-label='Progress'
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current + 1}
      className='mb-8 flex gap-1.5'
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className='relative h-1 flex-1 overflow-hidden rounded-full bg-zinc-100 dark:bg-white/10'
        >
          <motion.span
            className='absolute inset-0 origin-left rounded-full bg-primary transition-colors duration-500'
            initial={false}
            animate={{ scaleX: index <= current ? 1 : 0 }}
            transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
          />
        </span>
      ))}
    </motion.div>
  );
}

type AuthShellProps = {
  accentRgb: string;
  description: string;
  contentKey: string | number;
  children: ReactNode;
  headline?: string;
  background?: Background | null;
  progress?: Progress;
};

export default function AuthShell({
  accentRgb,
  description,
  contentKey,
  children,
  headline = DEFAULT_HEADLINE,
  background,
  progress,
}: AuthShellProps) {
  const { openCopyright } = useHelp();

  const themeStyle = {
    '--group-theme': accentRgb,
    '--on-primary': getContrastColorFromRgb(accentRgb, ON_ACCENT_LUMINANCE_THRESHOLD),
  } as CSSProperties;

  return (
    <MotionConfig reducedMotion='user'>
      <div
        style={themeStyle}
        className='grid min-h-screen bg-white dark:bg-zinc-950 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]'
      >
        <Showcase
          headline={headline}
          description={description}
          background={background}
        />

        <div className='relative flex flex-col lg:min-h-screen'>
          <div className='absolute right-5 top-5'>
            <ThemeToggle />
          </div>

          <main className='flex flex-1 items-center justify-center px-6 py-16'>
            <div className='w-full max-w-[26rem]'>
              <AnimatedHeight>
                {progress && <ProgressBar {...progress} />}
                <AnimatePresence
                  mode='wait'
                  initial={false}
                >
                  <motion.div
                    key={contentKey}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2 }}
                  >
                    {children}
                  </motion.div>
                </AnimatePresence>
              </AnimatedHeight>
            </div>
          </main>

          <footer className='flex items-center justify-center gap-4 px-4 pb-8 text-xs text-zinc-400 dark:text-zinc-500'>
            {FOOTER_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target='_blank'
                rel='noopener noreferrer'
                className='transition-colors hover:text-zinc-700 dark:hover:text-zinc-300'
              >
                {label}
              </a>
            ))}
            <button
              type='button'
              onClick={openCopyright}
              className='transition-colors hover:text-zinc-700 dark:hover:text-zinc-300'
            >
              Copyright
            </button>
            <span>v{packageInfo.version}</span>
          </footer>
        </div>
      </div>
    </MotionConfig>
  );
}

import { DOCS_URL, ISSUES_URL, RELEASES_URL, REPOSITORY_URL } from '@/utils/links';
import { Menu } from '@headlessui/react';
import {
  IconBook,
  IconBrandGithub,
  IconBug,
  IconDownload,
  IconHistory,
  IconLicense,
  IconLifebuoy,
} from '@tabler/icons-react';
import { AnimatePresence, motion } from 'framer-motion';

import MenuRow, { MenuDivider } from '../menu/MenuRow';
import { useHelp } from './HelpProvider';

const ICON_CLASS = 'h-4 w-4';
const ICON_STROKE = 1.75;

function versionLabel({ loading, current }: { loading: boolean; current: string }) {
  if (loading) return 'Checking…';
  return current ? `v${current}` : 'Unavailable';
}

export default function HelpFloatingButton() {
  const { version, openChangelog, openCopyright } = useHelp();

  return (
    <Menu
      as='div'
      className='fixed right-6 bottom-[4.5rem] z-[99998] lg:bottom-6'
    >
      {({ open }) => (
        <>
          <Menu.Button
            aria-label='Help and resources'
            className='relative flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-zinc-500 shadow-lg shadow-zinc-950/10 ring-1 ring-zinc-950/5 backdrop-blur transition-all hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 active:scale-95 dark:bg-zinc-900/90 dark:text-zinc-400 dark:shadow-black/40 dark:ring-white/10'
          >
            <IconLifebuoy
              className='h-5 w-5'
              stroke={ICON_STROKE}
            />
            {version.outdated && (
              <span className='absolute top-0.5 right-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-zinc-900' />
            )}
          </Menu.Button>

          <AnimatePresence>
            {open && (
              <Menu.Items
                static
                as={motion.div}
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 440, damping: 32, mass: 0.7 }}
                className='absolute right-0 bottom-full mb-3 w-64 origin-bottom-right rounded-2xl bg-white p-1.5 shadow-xl shadow-zinc-950/10 ring-1 ring-zinc-950/5 focus:outline-none dark:bg-zinc-900 dark:shadow-black/40 dark:ring-white/10'
              >
                <div className='flex items-center justify-between px-3 py-2.5'>
                  <p className='text-sm font-semibold text-zinc-900 dark:text-white'>Orbit</p>
                  <p
                    aria-live='polite'
                    className='text-xs text-zinc-500 dark:text-zinc-400'
                  >
                    {versionLabel(version)}
                  </p>
                </div>

                {version.outdated && version.latest && (
                  <MenuRow
                    icon={
                      <IconDownload
                        className={ICON_CLASS}
                        stroke={ICON_STROKE}
                      />
                    }
                    label='Update available'
                    detail={`v${version.latest}`}
                    href={RELEASES_URL}
                  />
                )}

                <MenuDivider />

                <MenuRow
                  icon={
                    <IconBook
                      className={ICON_CLASS}
                      stroke={ICON_STROKE}
                    />
                  }
                  label='Documentation'
                  href={DOCS_URL}
                />
                <MenuRow
                  icon={
                    <IconBrandGithub
                      className={ICON_CLASS}
                      stroke={ICON_STROKE}
                    />
                  }
                  label='GitHub'
                  href={REPOSITORY_URL}
                />
                <MenuRow
                  icon={
                    <IconBug
                      className={ICON_CLASS}
                      stroke={ICON_STROKE}
                    />
                  }
                  label='Report a bug'
                  href={ISSUES_URL}
                />
                <MenuRow
                  icon={
                    <IconHistory
                      className={ICON_CLASS}
                      stroke={ICON_STROKE}
                    />
                  }
                  label='Changelog'
                  onClick={openChangelog}
                />

                <MenuDivider />

                <MenuRow
                  icon={
                    <IconLicense
                      className={ICON_CLASS}
                      stroke={ICON_STROKE}
                    />
                  }
                  label='Copyright & licensing'
                  onClick={openCopyright}
                />
              </Menu.Items>
            )}
          </AnimatePresence>
        </>
      )}
    </Menu>
  );
}

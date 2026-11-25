import { Dialog, Transition } from '@headlessui/react';
import { IconX } from '@tabler/icons-react';
import clsx from 'clsx';
import { Fragment } from 'react';
import type { ReactNode } from 'react';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  children: ReactNode;
};

export default function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  size = 'md',
  children,
}: ModalProps) {
  return (
    <Transition
      show={open}
      as={Fragment}
    >
      <Dialog
        onClose={onClose}
        className='relative z-[99999]'
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
          <div
            aria-hidden
            className='fixed inset-0 bg-zinc-950/40 backdrop-blur-sm'
          />
        </Transition.Child>

        <div className='fixed inset-0 flex items-center justify-center overflow-y-auto p-4'>
          <Transition.Child
            as={Fragment}
            enter='ease-out duration-200'
            enterFrom='opacity-0 translate-y-1 scale-95'
            enterTo='opacity-100 translate-y-0 scale-100'
            leave='ease-in duration-150'
            leaveFrom='opacity-100 translate-y-0 scale-100'
            leaveTo='opacity-0 translate-y-1 scale-95'
          >
            <Dialog.Panel
              className={clsx(
                'flex max-h-[min(85vh,44rem)] w-full flex-col overflow-hidden rounded-2xl bg-white shadow-2xl shadow-zinc-950/20 ring-1 ring-zinc-950/5 focus:outline-none dark:bg-zinc-900 dark:ring-white/10',
                SIZES[size],
              )}
            >
              <div className='flex shrink-0 items-start justify-between gap-4 px-6 pt-6 pb-4'>
                <div className='min-w-0'>
                  <Dialog.Title className='text-base font-semibold tracking-tight text-zinc-900 dark:text-white'>
                    {title}
                  </Dialog.Title>
                  {description && (
                    <p className='mt-0.5 text-sm text-zinc-500 dark:text-zinc-400'>{description}</p>
                  )}
                </div>
                <button
                  type='button'
                  onClick={onClose}
                  aria-label='Close'
                  className='-mt-1 -mr-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:hover:bg-white/5 dark:hover:text-zinc-200'
                >
                  <IconX
                    className='h-4 w-4'
                    stroke={1.75}
                  />
                </button>
              </div>

              <div
                className={clsx(
                  'min-h-0 flex-1 overflow-y-auto overscroll-contain px-6',
                  footer ? 'pb-3' : 'pb-6',
                )}
              >
                {children}
              </div>

              {footer && (
                <div className='shrink-0 border-t border-zinc-100 px-4 py-3 dark:border-white/5'>
                  {footer}
                </div>
              )}
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
}

import { IconEye, IconEyeOff } from '@tabler/icons-react';
import clsx from 'clsx';
import { forwardRef, useId } from 'react';
import type { InputHTMLAttributes, ReactNode } from 'react';

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  action?: ReactNode;
};

const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, error, hint, action, className, id, ...inputProps },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = `${inputId}-message`;
  const message = error ?? hint;

  return (
    <div>
      <label
        htmlFor={inputId}
        className='mb-2 block text-[13px] font-medium text-zinc-600 dark:text-zinc-400'
      >
        {label}
      </label>
      <div className='relative'>
        <input
          {...inputProps}
          ref={ref}
          id={inputId}
          aria-invalid={Boolean(error)}
          aria-describedby={message ? messageId : undefined}
          className={clsx(
            'h-11 w-full rounded-xl border-0 bg-zinc-100/80 px-3.5 text-sm text-zinc-900 transition duration-200 placeholder:text-zinc-400 focus:bg-white focus:outline-none focus:ring-2 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500 dark:focus:bg-white/[0.08]',
            error ? 'ring-2 ring-red-500/50 focus:ring-red-500/50' : 'focus:ring-primary/40',
            action && 'pr-11',
            className,
          )}
        />
        {action && <div className='absolute inset-y-0 right-1.5 flex items-center'>{action}</div>}
      </div>
      {message && (
        <p
          id={messageId}
          className={clsx(
            'mt-2 text-xs leading-relaxed',
            error ? 'text-red-500' : 'text-zinc-400 dark:text-zinc-500',
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
});

export default Field;

type VisibilityToggleProps = {
  visible: boolean;
  onToggle: () => void;
  label: string;
};

export function VisibilityToggle({ visible, onToggle, label }: VisibilityToggleProps) {
  const Icon = visible ? IconEye : IconEyeOff;

  return (
    <button
      type='button'
      onClick={onToggle}
      aria-label={visible ? `Hide ${label}` : `Show ${label}`}
      className='flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:text-zinc-700 dark:hover:text-zinc-200'
    >
      <Icon
        className='h-4 w-4'
        stroke={1.75}
      />
    </button>
  );
}

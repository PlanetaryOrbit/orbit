import type { ReactNode } from 'react';

type AuthHeadingProps = {
  title: ReactNode;
  subtitle: string;
};

export default function AuthHeading({ title, subtitle }: AuthHeadingProps) {
  return (
    <div className='mb-8'>
      <h2 className='text-2xl font-semibold tracking-tight text-zinc-900 dark:text-white'>
        {title}
      </h2>
      <p className='mt-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400'>{subtitle}</p>
    </div>
  );
}

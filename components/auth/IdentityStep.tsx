import { getAvatarBgColor } from '@/utils/avatarColor';
import Image from 'next/image';

import AuthButton from './AuthButton';
import AuthHeading from './AuthHeading';
import type { Identity } from './types';

type IdentityStepProps = {
  identity: Identity;
  title: string;
  subtitle: string;
  confirmLabel: string;
  onBack: () => void;
  onContinue: () => void;
};

export default function IdentityStep({
  identity,
  title,
  subtitle,
  confirmLabel,
  onBack,
  onContinue,
}: IdentityStepProps) {
  return (
    <>
      <div
        className='mb-6 flex h-24 w-24 items-center justify-center overflow-hidden rounded-3xl p-2'
        style={{ backgroundColor: getAvatarBgColor(identity.displayName) }}
      >
        {identity.thumbnail ? (
          <Image
            src={identity.thumbnail}
            alt=''
            width={96}
            height={96}
            unoptimized
            className='h-full w-full object-contain object-bottom'
          />
        ) : (
          <span className='text-3xl font-medium text-zinc-500'>?</span>
        )}
      </div>

      <AuthHeading
        title={title}
        subtitle={subtitle}
      />

      <div className='space-y-1'>
        <AuthButton
          type='button'
          className='w-full'
          onClick={onContinue}
        >
          {confirmLabel}
        </AuthButton>
        <AuthButton
          type='button'
          variant='ghost'
          className='w-full'
          onClick={onBack}
        >
          Back
        </AuthButton>
      </div>
    </>
  );
}

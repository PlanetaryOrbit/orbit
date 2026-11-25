import { useState } from 'react';
import { toast } from 'react-hot-toast';

import AuthButton from './AuthButton';
import AuthHeading from './AuthHeading';

const INSTRUCTIONS = [
  'Go to your Roblox profile',
  'Click "Edit Profile"',
  'Paste the code into your Bio / About section',
  'Save, then click Verify below',
];

type CodeVerificationProps = {
  title: string;
  subtitle: string;
  code: string;
  onBack: () => void;
  onVerify: () => Promise<string | null>;
};

export default function CodeVerification({
  title,
  subtitle,
  code,
  onBack,
  onVerify,
}: CodeVerificationProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast.success('Verification code copied to clipboard');
  };

  const verify = async () => {
    setLoading(true);
    setError(null);
    setError(await onVerify());
    setLoading(false);
  };

  return (
    <>
      <AuthHeading
        title={title}
        subtitle={subtitle}
      />

      <button
        type='button'
        onClick={copyCode}
        title='Click to copy'
        className='w-full rounded-xl bg-zinc-100 px-4 py-4 text-center font-mono text-sm text-zinc-900 transition-colors hover:bg-zinc-200 dark:bg-white/5 dark:text-white dark:hover:bg-white/10'
      >
        {code}
      </button>

      <ol className='mt-6 list-inside list-decimal space-y-1.5 text-sm text-zinc-500 dark:text-zinc-400'>
        {INSTRUCTIONS.map((instruction) => (
          <li key={instruction}>{instruction}</li>
        ))}
      </ol>

      {error && <p className='mt-4 text-center text-sm text-red-500'>{error}</p>}

      <div className='mt-8 space-y-1'>
        <AuthButton
          type='button'
          className='w-full'
          loading={loading}
          onClick={verify}
        >
          Verify
        </AuthButton>
        <AuthButton
          type='button'
          variant='ghost'
          className='w-full'
          disabled={loading}
          onClick={onBack}
        >
          Back
        </AuthButton>
      </div>
    </>
  );
}

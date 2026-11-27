import AuthButton from '@/components/auth/AuthButton';
import AuthHeading from '@/components/auth/AuthHeading';
import Field, { VisibilityToggle } from '@/components/auth/Field';
import { IconCheck, IconX } from '@tabler/icons-react';
import axios from 'axios';
import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { toast } from 'react-hot-toast';

type KeyStatus = 'idle' | 'testing' | 'verified' | 'failed';

const KEY_ERRORS: Record<number, string> = {
  1: "API key is missing the 'group' scope",
  2: 'API key needs both read and write permissions',
  3: 'API key has expired',
  4: 'API key is disabled',
  5: 'Invalid API key',
  400: 'API key is not provided in a valid format.',
};

function KeyStatusBadge({ status }: { status: KeyStatus }) {
  if (status === 'verified') {
    return (
      <span className='inline-flex items-center gap-1 text-[13px] font-medium text-emerald-600 dark:text-emerald-400'>
        <IconCheck
          className='h-4 w-4'
          stroke={2.5}
        />
        Verified
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span className='inline-flex items-center gap-1 text-[13px] font-medium text-red-600 dark:text-red-400'>
        <IconX
          className='h-4 w-4'
          stroke={2.5}
        />
        Invalid key
      </span>
    );
  }

  return null;
}

type OpenCloudStepProps = {
  savedKey: string;
  setupToken?: string;
  onBack: () => void;
  onContinue: (key: string, setupToken: string) => void;
};

export default function OpenCloudStep({
  savedKey,
  setupToken,
  onBack,
  onContinue,
}: OpenCloudStepProps) {
  const [apiKey, setApiKey] = useState(savedKey);
  const [token, setToken] = useState(setupToken ?? '');
  const [status, setStatus] = useState<KeyStatus>(savedKey ? 'verified' : 'idle');
  const [revealed, setRevealed] = useState(false);

  const trimmedKey = apiKey.trim();
  const canContinue = status !== 'testing' && (!trimmedKey || status === 'verified');

  const handleKeyChange = (event: ChangeEvent<HTMLInputElement>) => {
    setApiKey(event.target.value);
    setStatus('idle');
  };

  const testKey = async () => {
    setStatus('testing');

    try {
      const { data } = await axios.post(
        '/api/setup/opencloudtest',
        { key: trimmedKey },
        { headers: token ? { 'x-setup-token': token } : undefined },
      );

      if (data.success) {
        setStatus('verified');
        toast.success('API key is valid');
        return;
      }

      setStatus('failed');
      toast.error('API key is invalid');
    } catch (error) {
      const { code, message } = (axios.isAxiosError(error) && error.response?.data) || {};
      setStatus('failed');
      toast.error(KEY_ERRORS[code] ?? message ?? 'Failed to test key');
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (canContinue) onContinue(trimmedKey, token);
  };

  return (
    <form onSubmit={handleSubmit}>
      <AuthHeading
        title='Connect Open Cloud'
        subtitle='Optional. Unlocks deeper Roblox group features, and you can set it up later in Settings.'
      />

      <div className='space-y-4'>
        <Field
          label='API key'
          type={revealed ? 'text' : 'password'}
          value={apiKey}
          onChange={handleKeyChange}
          placeholder='Open Cloud API key'
          autoComplete='off'
          spellCheck={false}
          hint={
            <>
              Needs <span className='text-zinc-600 dark:text-zinc-300'>group:read</span> and{' '}
              <span className='text-zinc-600 dark:text-zinc-300'>group:write</span>, and must be a
              user API key.
            </>
          }
          action={
            <VisibilityToggle
              visible={revealed}
              onToggle={() => setRevealed((value) => !value)}
              label='API key'
            />
          }
        />

        <Field
          label='Setup token'
          type='password'
          value={token}
          onChange={(event) => setToken(event.target.value)}
          placeholder='Required in production'
          autoComplete='off'
          spellCheck={false}
        />

        <div className='flex items-center gap-3'>
          <AuthButton
            type='button'
            variant='secondary'
            size='sm'
            loading={status === 'testing'}
            disabled={!trimmedKey}
            onClick={testKey}
          >
            {status === 'testing' ? 'Testing' : 'Test key'}
          </AuthButton>
          <KeyStatusBadge status={status} />
        </div>
      </div>

      <div className='mt-8 space-y-1'>
        <AuthButton
          type='submit'
          className='w-full'
          disabled={!canContinue}
        >
          {trimmedKey ? 'Continue' : 'Skip for now'}
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
    </form>
  );
}

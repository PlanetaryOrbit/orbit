import { getApiErrorMessage } from '@/utils/apiErrorMessage';
import axios from 'axios';
import Link from 'next/link';
import { useForm } from 'react-hook-form';

import AuthButton, { authActionClass } from '../AuthButton';
import AuthHeading from '../AuthHeading';
import Field from '../Field';
import type { ResetSession } from './types';

type RequestStepProps = {
  username: string;
  onContinue: (username: string, session: ResetSession) => void;
};

export default function RequestStep({ username, onContinue }: RequestStepProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ username: string }>({ defaultValues: { username } });

  const submit = handleSubmit(async (values) => {
    try {
      const { data } = await axios.post('/api/auth/reset/start', { username: values.username });

      onContinue(values.username, {
        identity: {
          displayName: data.displayName || values.username,
          thumbnail: data.thumbnail || '',
        },
        code: data.code,
        userId: data.userId,
      });
    } catch (error) {
      setError('username', { type: 'server', message: getApiErrorMessage(error) });
    }
  });

  return (
    <>
      <AuthHeading
        title='Forgot your password?'
        subtitle='Enter your Roblox username to start the reset.'
      />

      <form
        onSubmit={submit}
        noValidate
      >
        <Field
          label='Roblox username'
          autoComplete='username'
          error={errors.username?.message}
          {...register('username', { required: 'Username is required' })}
        />

        <AuthButton
          type='submit'
          className='mt-6 w-full'
          loading={isSubmitting}
        >
          Continue
        </AuthButton>
      </form>

      <div className='mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400'>
        Remembered it?{' '}
        <Link
          href='/login'
          className={authActionClass}
        >
          Sign in
        </Link>
      </div>
    </>
  );
}

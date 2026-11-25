import type { Availability } from '@/hooks/useUsernameAvailability';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';
import axios from 'axios';
import { useForm } from 'react-hook-form';

import AuthButton, { authActionClass } from '../AuthButton';
import AuthHeading from '../AuthHeading';
import Field from '../Field';
import OAuthButtons, { AuthDivider, hasProviders } from '../OAuthButtons';
import type { AvailableProviders } from '../OAuthButtons';
import type { Identity } from '../types';

type UsernameStepProps = {
  username: string;
  availability: Availability;
  providers: AvailableProviders;
  oauthOnly: boolean;
  onUsernameChange: (username: string) => void;
  onContinue: (username: string, identity: Identity) => void;
  onSignIn: () => void;
};

function AvailabilityHint({ status }: Pick<Availability, 'status'>) {
  if (status === 'checking') return <>Checking username…</>;

  if (status === 'available') {
    return <span className='text-emerald-600 dark:text-emerald-400'>Username is available</span>;
  }

  return null;
}

export default function UsernameStep({
  username,
  availability,
  providers,
  oauthOnly,
  onUsernameChange,
  onContinue,
  onSignIn,
}: UsernameStepProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<{ username: string }>({ defaultValues: { username } });

  const submit = handleSubmit(async (values) => {
    try {
      const { data } = await axios.post('/api/auth/signup/preview', {
        username: values.username,
      });

      onContinue(values.username, {
        displayName: data.displayName || values.username,
        thumbnail: data.thumbnail || '',
      });
    } catch (error) {
      setError('username', { type: 'server', message: getApiErrorMessage(error) });
    }
  });

  const usernameError =
    errors.username?.message ??
    (availability.status === 'unavailable' ? availability.message : undefined);

  return (
    <>
      <AuthHeading
        title='Create an account'
        subtitle={
          oauthOnly
            ? 'Use one of the options below to get started.'
            : 'Choose your Roblox username to get started.'
        }
      />

      {oauthOnly ? (
        <OAuthButtons providers={providers} />
      ) : (
        <form
          onSubmit={submit}
          noValidate
        >
          <Field
            label='Roblox username'
            autoComplete='username'
            error={usernameError}
            hint={<AvailabilityHint status={availability.status} />}
            {...register('username', {
              required: 'Username is required',
              onChange: (event) => onUsernameChange(event.target.value),
            })}
          />

          <AuthButton
            type='submit'
            className='mt-6 w-full'
            loading={isSubmitting}
            disabled={availability.status !== 'available'}
          >
            Continue
          </AuthButton>

          {hasProviders(providers) && (
            <>
              <AuthDivider />
              <OAuthButtons
                providers={providers}
                disabled={isSubmitting}
              />
            </>
          )}
        </form>
      )}

      <div className='mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400'>
        Already have an account?{' '}
        <button
          type='button'
          onClick={onSignIn}
          className={authActionClass}
        >
          Sign in
        </button>
      </div>
    </>
  );
}

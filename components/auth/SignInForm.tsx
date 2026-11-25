import type { LoginState } from '@/state';
import axios from 'axios';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';

import AuthButton, { authActionClass, authLinkClass } from './AuthButton';
import AuthHeading from './AuthHeading';
import Field, { VisibilityToggle } from './Field';
import OAuthButtons, { AuthDivider, hasProviders } from './OAuthButtons';
import type { AvailableProviders } from './OAuthButtons';

type SignInValues = {
  username: string;
  password: string;
};

type SignInFormProps = {
  providers: AvailableProviders;
  oauthOnly: boolean;
  onSignedIn: (session: LoginState) => void;
  onCreateAccount: () => void;
};

const GENERIC_ERROR = 'Something went wrong';

export default function SignInForm({
  providers,
  oauthOnly,
  onSignedIn,
  onCreateAccount,
}: SignInFormProps) {
  const [revealed, setRevealed] = useState(false);
  const [usePassword, setUsePassword] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<SignInValues>();

  const showOAuthOnly = oauthOnly && !usePassword;

  const submit = handleSubmit(async (values) => {
    try {
      const { data } = await axios.post('/api/auth/login', values);
      onSignedIn({ ...data.user, workspaces: data.workspaces });
    } catch (error) {
      const status = axios.isAxiosError(error) ? error.response?.status : undefined;
      const message = axios.isAxiosError(error) ? error.response?.data?.error : undefined;

      if (status === 404) {
        setError('username', { type: 'server', message });
      } else if (status === 401) {
        setError('password', { type: 'server', message });
      } else {
        setError('username', { type: 'server', message: GENERIC_ERROR });
        setError('password', { type: 'server', message: GENERIC_ERROR });
      }
    }
  });

  return (
    <>
      <AuthHeading
        title='Sign in'
        subtitle={
          showOAuthOnly
            ? 'Use one of the options below to sign in.'
            : 'Use your username and password to continue.'
        }
      />

      {showOAuthOnly ? (
        <>
          <OAuthButtons providers={providers} />
          <div className='mt-6 text-center'>
            <button
              type='button'
              onClick={() => setUsePassword(true)}
              className={authLinkClass}
            >
              Having trouble? Sign in with a password
            </button>
          </div>
        </>
      ) : (
        <form
          onSubmit={submit}
          noValidate
        >
          <div className='space-y-4'>
            <Field
              label='Username'
              autoComplete='username'
              error={errors.username?.message}
              {...register('username', { required: 'Username is required' })}
            />
            <Field
              label='Password'
              type={revealed ? 'text' : 'password'}
              autoComplete='current-password'
              error={errors.password?.message}
              action={
                <VisibilityToggle
                  visible={revealed}
                  onToggle={() => setRevealed((value) => !value)}
                  label='password'
                />
              }
              {...register('password', { required: 'Password is required' })}
            />
          </div>

          <div className='mt-3 flex justify-end'>
            <Link
              href='/forgot-password'
              className={authLinkClass}
            >
              Forgot password?
            </Link>
          </div>

          <AuthButton
            type='submit'
            className='mt-6 w-full'
            loading={isSubmitting}
          >
            Sign in
          </AuthButton>

          {!oauthOnly && hasProviders(providers) && (
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
        {oauthOnly && usePassword ? (
          <button
            type='button'
            onClick={() => setUsePassword(false)}
            className={authLinkClass}
          >
            Back to sign-in options
          </button>
        ) : (
          <>
            New to Orbit?{' '}
            <button
              type='button'
              onClick={onCreateAccount}
              className={authActionClass}
            >
              Create an account
            </button>
          </>
        )}
      </div>
    </>
  );
}

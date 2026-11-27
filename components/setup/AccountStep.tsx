import AuthButton from '@/components/auth/AuthButton';
import AuthHeading from '@/components/auth/AuthHeading';
import Field, { VisibilityToggle } from '@/components/auth/Field';
import PasswordStrengthBar from '@/components/passwordStrengthBar';
import { calculatePasswordStrength } from '@/utils/passwordStrength';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import type { AccountValues } from './types';

type AccountStepProps = {
  onBack: () => void;
  onCreate: (values: AccountValues) => Promise<string | null>;
};

export default function AccountStep({ onBack, onCreate }: AccountStepProps) {
  const [revealed, setRevealed] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AccountValues>();

  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const strength = calculatePasswordStrength(password);

  const submit = handleSubmit(async (values) => {
    const usernameError = await onCreate(values);
    if (usernameError) setError('username', { type: 'server', message: usernameError });
  });

  return (
    <form
      onSubmit={submit}
      noValidate
    >
      <AuthHeading
        title='Create your account'
        subtitle='This becomes the owner account for your Orbit instance.'
      />

      <div className='space-y-4'>
        <Field
          label='Roblox username'
          autoComplete='username'
          error={errors.username?.message}
          {...register('username', { required: 'Username is required' })}
        />

        <div>
          <Field
            label='Password'
            type={revealed ? 'text' : 'password'}
            autoComplete='new-password'
            error={errors.password?.message}
            action={
              <VisibilityToggle
                visible={revealed}
                onToggle={() => setRevealed((value) => !value)}
                label='password'
              />
            }
            {...register('password', {
              required: 'Password is required',
              validate: (value) =>
                calculatePasswordStrength(value).score >= 3 || 'Password must be at least Strong',
            })}
          />
          <PasswordStrengthBar password={password} />
        </div>

        <Field
          label='Confirm password'
          type={revealed ? 'text' : 'password'}
          autoComplete='new-password'
          error={errors.verifyPassword?.message}
          {...register('verifyPassword', {
            required: 'Please confirm your password',
            validate: (value, { password: original }) =>
              value === original || 'Passwords do not match',
          })}
        />

        <Field
          label='Setup token'
          type='password'
          autoComplete='off'
          hint='Required in production. Leave blank for local development.'
          {...register('setupToken')}
        />
      </div>

      <div className='mt-8 space-y-1'>
        <AuthButton
          type='submit'
          className='w-full'
          loading={isSubmitting}
          disabled={strength.score < 3}
        >
          {isSubmitting ? 'Creating' : 'Finish setup'}
        </AuthButton>
        <AuthButton
          type='button'
          variant='ghost'
          className='w-full'
          disabled={isSubmitting}
          onClick={onBack}
        >
          Back
        </AuthButton>
      </div>
    </form>
  );
}

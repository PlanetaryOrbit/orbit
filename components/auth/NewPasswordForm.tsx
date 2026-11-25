import PasswordStrengthBar from '@/components/passwordStrengthBar';
import { calculatePasswordStrength } from '@/utils/passwordStrength';
import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';

import AuthButton from './AuthButton';
import AuthHeading from './AuthHeading';
import Field, { VisibilityToggle } from './Field';

const MIN_PASSWORD_LENGTH = 7;

type PasswordValues = {
  password: string;
  verifyPassword: string;
};

type NewPasswordFormProps = {
  title: string;
  subtitle: string;
  submitLabel: string;
  onSubmit: (password: string) => Promise<string | null>;
  onBack: () => void;
};

export default function NewPasswordForm({
  title,
  subtitle,
  submitLabel,
  onSubmit,
  onBack,
}: NewPasswordFormProps) {
  const [revealed, setRevealed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>();

  const password = useWatch({ control, name: 'password', defaultValue: '' });
  const strength = calculatePasswordStrength(password);

  const submit = handleSubmit(async (values) => {
    setError(null);
    setError(await onSubmit(values.password));
  });

  return (
    <form
      onSubmit={submit}
      noValidate
    >
      <AuthHeading
        title={title}
        subtitle={subtitle}
      />

      <div className='space-y-4'>
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
              minLength: {
                value: MIN_PASSWORD_LENGTH,
                message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
              },
              validate: (value) =>
                calculatePasswordStrength(value).score >= 3 || 'Password is not strong enough',
            })}
          />
          <PasswordStrengthBar password={password} />
        </div>

        <Field
          label='Confirm password'
          type={revealed ? 'text' : 'password'}
          autoComplete='new-password'
          error={errors.verifyPassword?.message}
          hint="Don't share your password or reuse your Roblox password."
          {...register('verifyPassword', {
            required: 'Please confirm your password',
            validate: (value, { password: original }) =>
              value === original || 'Passwords must match',
          })}
        />
      </div>

      {error && <p className='mt-4 text-center text-sm text-red-500'>{error}</p>}

      <div className='mt-8 space-y-1'>
        <AuthButton
          type='submit'
          className='w-full'
          loading={isSubmitting}
          disabled={strength.score < 3}
        >
          {submitLabel}
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

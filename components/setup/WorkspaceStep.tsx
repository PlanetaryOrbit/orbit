import AuthButton from '@/components/auth/AuthButton';
import AuthHeading from '@/components/auth/AuthHeading';
import Field from '@/components/auth/Field';
import { DOCS_URL } from '@/utils/links';
import { useForm } from 'react-hook-form';

import AccentPicker from './AccentPicker';

type WorkspaceStepProps = {
  groupId: string;
  accent: string;
  onAccentChange: (color: string) => void;
  onContinue: (groupId: string) => void;
};

export default function WorkspaceStep({
  groupId,
  accent,
  onAccentChange,
  onContinue,
}: WorkspaceStepProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ groupId: string }>({ defaultValues: { groupId } });

  return (
    <form
      onSubmit={handleSubmit((values) => onContinue(values.groupId))}
      noValidate
    >
      <AuthHeading
        title="Let's get started"
        subtitle='Connect your Roblox group and pick a color for your instance.'
      />

      <div className='space-y-6'>
        <Field
          label='Group ID'
          placeholder='35724790'
          inputMode='numeric'
          autoComplete='off'
          hint="The number in your group's URL on roblox.com."
          error={errors.groupId?.message}
          {...register('groupId', {
            required: 'Group ID is required',
            pattern: { value: /^\d+$/, message: 'Group ID must be a number' },
          })}
        />

        <div>
          <p className='mb-3 text-[13px] font-medium text-zinc-600 dark:text-zinc-400'>Color</p>
          <AccentPicker
            value={accent}
            onChange={onAccentChange}
          />
        </div>
      </div>

      <div className='mt-8 space-y-3'>
        <AuthButton
          type='submit'
          className='w-full'
        >
          Continue
        </AuthButton>
        <p className='text-center text-xs text-zinc-400 dark:text-zinc-500'>
          Need help?{' '}
          <a
            href={DOCS_URL}
            target='_blank'
            rel='noopener noreferrer'
            className='text-zinc-600 underline-offset-4 transition-colors hover:text-zinc-900 hover:underline dark:text-zinc-300 dark:hover:text-white'
          >
            Read the docs
          </a>
        </p>
      </div>
    </form>
  );
}

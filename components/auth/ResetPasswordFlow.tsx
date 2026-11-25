import { getApiErrorMessage } from '@/utils/apiErrorMessage';
import axios from 'axios';
import { useState } from 'react';

import CodeVerification from './CodeVerification';
import IdentityStep from './IdentityStep';
import NewPasswordForm from './NewPasswordForm';
import RequestStep from './reset/RequestStep';
import type { ResetSession, ResetStep } from './reset/types';

const VERIFICATION_FAILED = 'Verification failed';

type ResetPasswordFlowProps = {
  step: ResetStep;
  onStepChange: (step: ResetStep) => void;
  onComplete: () => void;
};

export default function ResetPasswordFlow({
  step,
  onStepChange,
  onComplete,
}: ResetPasswordFlowProps) {
  const [username, setUsername] = useState('');
  const [session, setSession] = useState<ResetSession | null>(null);

  const verifyCode = async (current: ResetSession) => {
    try {
      const { data } = await axios.post('/api/auth/reset/verify', { userId: current.userId });

      if (!data.success) return VERIFICATION_FAILED;

      onStepChange(3);
      return null;
    } catch (error) {
      return getApiErrorMessage(error, VERIFICATION_FAILED);
    }
  };

  const finishReset = async (current: ResetSession, password: string) => {
    try {
      await axios.post('/api/auth/reset/finish', { password, userId: current.userId });
      onComplete();
      return null;
    } catch (error) {
      return getApiErrorMessage(error, VERIFICATION_FAILED);
    }
  };

  if (step === 0 || !session) {
    return (
      <RequestStep
        username={username}
        onContinue={(nextUsername, nextSession) => {
          setUsername(nextUsername);
          setSession(nextSession);
          onStepChange(1);
        }}
      />
    );
  }

  if (step === 1) {
    return (
      <IdentityStep
        identity={session.identity}
        title={`Are you really ${session.identity.displayName}?`}
        subtitle="Confirm this is your Roblox account. Next, we'll ask you to add a verification code to your profile."
        confirmLabel='Yes, continue'
        onBack={() => onStepChange(0)}
        onContinue={() => onStepChange(2)}
      />
    );
  }

  if (step === 2) {
    return (
      <CodeVerification
        title='Add the code to your profile'
        subtitle='Paste the code below into your Roblox profile blurb to prove ownership, then click Verify.'
        code={session.code}
        onBack={() => onStepChange(1)}
        onVerify={() => verifyCode(session)}
      />
    );
  }

  return (
    <NewPasswordForm
      title='Set your new password'
      subtitle='Enter and confirm your new password.'
      submitLabel='Reset password'
      onSubmit={(password) => finishReset(session, password)}
      onBack={() => onStepChange(2)}
    />
  );
}

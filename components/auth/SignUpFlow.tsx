import { useUsernameAvailability } from '@/hooks/useUsernameAvailability';
import { getApiErrorMessage } from '@/utils/apiErrorMessage';
import axios from 'axios';
import { useState } from 'react';

import CodeVerification from './CodeVerification';
import IdentityStep from './IdentityStep';
import NewPasswordForm from './NewPasswordForm';
import type { AvailableProviders } from './OAuthButtons';
import type { SignUpStep, Verification } from './signup/types';
import UsernameStep from './signup/UsernameStep';
import { EMPTY_IDENTITY } from './types';
import type { Identity } from './types';

type SignUpFlowProps = {
  step: SignUpStep;
  onStepChange: (step: SignUpStep) => void;
  providers: AvailableProviders;
  oauthOnly: boolean;
  onComplete: () => void;
  onSignIn: () => void;
};

export default function SignUpFlow({
  step,
  onStepChange,
  providers,
  oauthOnly,
  onComplete,
  onSignIn,
}: SignUpFlowProps) {
  const { availability, check } = useUsernameAvailability();
  const [username, setUsername] = useState('');
  const [identity, setIdentity] = useState<Identity>(EMPTY_IDENTITY);
  const [password, setPassword] = useState('');
  const [verification, setVerification] = useState<Verification | null>(null);

  const startVerification = async (nextPassword: string) => {
    try {
      const { data } = await axios.post('/api/auth/signup/start', { username });
      setPassword(nextPassword);
      setVerification({ code: data.code, userId: data.userid });
      onStepChange(3);
      return null;
    } catch (error) {
      return getApiErrorMessage(error, 'Unexpected error occurred.');
    }
  };

  const finishSignUp = async (current: Verification) => {
    try {
      const { data } = await axios.post('/api/auth/signup/finish', {
        password,
        code: current.code,
        userid: current.userId,
      });

      if (!data.success) return 'Verification failed. Please try again.';

      onComplete();
      return null;
    } catch (error) {
      return getApiErrorMessage(error, 'Verification not found. Please try again.');
    }
  };

  if (step === 0) {
    return (
      <UsernameStep
        username={username}
        availability={availability}
        providers={providers}
        oauthOnly={oauthOnly}
        onUsernameChange={check}
        onContinue={(nextUsername, nextIdentity) => {
          setUsername(nextUsername);
          setIdentity(nextIdentity);
          onStepChange(1);
        }}
        onSignIn={onSignIn}
      />
    );
  }

  if (step === 1) {
    return (
      <IdentityStep
        identity={identity}
        title={`Is ${identity.displayName} correct?`}
        subtitle='Confirm this is your Roblox account, then choose a password.'
        confirmLabel='Yes, continue'
        onBack={() => onStepChange(0)}
        onContinue={() => onStepChange(2)}
      />
    );
  }

  if (step === 3 && verification) {
    return (
      <CodeVerification
        title='Verify your account'
        subtitle='Paste this code into your Roblox profile bio, then click Verify.'
        code={verification.code}
        onBack={() => onStepChange(2)}
        onVerify={() => finishSignUp(verification)}
      />
    );
  }

  return (
    <NewPasswordForm
      title='Set a password'
      subtitle='Choose a secure password for your account.'
      submitLabel='Continue'
      onSubmit={startVerification}
      onBack={() => onStepChange(1)}
    />
  );
}

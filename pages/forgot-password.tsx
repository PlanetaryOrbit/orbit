import AuthShell from '@/components/auth/AuthShell';
import { RESET_STEP_COUNT } from '@/components/auth/reset/types';
import type { ResetStep } from '@/components/auth/reset/types';
import ResetPasswordFlow from '@/components/auth/ResetPasswordFlow';
import { useLoginAppearance } from '@/hooks/useLoginAppearance';
import type { NextPage } from 'next';
import Head from 'next/head';
import Router from 'next/router';
import { useState } from 'react';

const ForgotPassword: NextPage = () => {
  const appearance = useLoginAppearance();
  const [step, setStep] = useState<ResetStep>(0);

  if (!appearance.loaded) return null;

  return (
    <>
      <Head>
        <title>Reset password · Orbit</title>
      </Head>

      <AuthShell
        accentRgb={appearance.accentRgb}
        headline='Reset your password.'
        description="We'll verify your Roblox account, then let you set a new password."
        background={appearance.background}
        progress={{ current: step, total: RESET_STEP_COUNT }}
        contentKey={step}
      >
        <ResetPasswordFlow
          step={step}
          onStepChange={setStep}
          onComplete={() => Router.push('/')}
        />
      </AuthShell>
    </>
  );
};

export default ForgotPassword;

import AuthShell from '@/components/auth/AuthShell';
import { hasProviders } from '@/components/auth/OAuthButtons';
import SignInForm from '@/components/auth/SignInForm';
import { SIGN_UP_STEP_COUNT } from '@/components/auth/signup/types';
import type { SignUpStep } from '@/components/auth/signup/types';
import SignUpFlow from '@/components/auth/SignUpFlow';
import { useLoginAppearance } from '@/hooks/useLoginAppearance';
import { useLoginErrorToast } from '@/hooks/useLoginErrorToast';
import { useOAuthConfig } from '@/hooks/useOAuthConfig';
import { useRedirectIfSignedIn } from '@/hooks/useRedirectIfSignedIn';
import { RobloxOAuthAvailable } from '@/hooks/useRobloxOAuth';
import { loginState } from '@/state';
import type { LoginState } from '@/state';
import type { NextPage } from 'next';
import Head from 'next/head';
import Router from 'next/router';
import { useState } from 'react';
import { useSetRecoilState } from 'recoil';

type Mode = 'signin' | 'signup';

const Login: NextPage = () => {
  const setLogin = useSetRecoilState(loginState);
  const appearance = useLoginAppearance();
  const roblox = RobloxOAuthAvailable();
  const { discord, google, oauthOnly, loading: oauthLoading } = useOAuthConfig();
  const [mode, setMode] = useState<Mode>('signin');
  const [signUpStep, setSignUpStep] = useState<SignUpStep>(0);

  useRedirectIfSignedIn();
  useLoginErrorToast();

  if (!appearance.loaded || roblox.loading || oauthLoading) return null;

  const providers = {
    roblox: roblox.isAvailable,
    discord: discord.available,
    google: google.available,
  };
  const providerOnly = oauthOnly && hasProviders(providers);

  const handleSignedIn = (session: LoginState) => {
    setLogin(session);
    Router.push('/');
  };

  const showSignIn = () => {
    setMode('signin');
    setSignUpStep(0);
  };

  return (
    <>
      <Head>
        <title>Sign in · Orbit</title>
      </Head>

      <AuthShell
        accentRgb={appearance.accentRgb}
        description='Sign in or create an account to access your workspaces.'
        background={appearance.background}
        progress={
          mode === 'signup' ? { current: signUpStep, total: SIGN_UP_STEP_COUNT } : undefined
        }
        contentKey={mode === 'signin' ? mode : `${mode}-${signUpStep}`}
      >
        {mode === 'signin' ? (
          <SignInForm
            providers={providers}
            oauthOnly={providerOnly}
            onSignedIn={handleSignedIn}
            onCreateAccount={() => setMode('signup')}
          />
        ) : (
          <SignUpFlow
            step={signUpStep}
            onStepChange={setSignUpStep}
            providers={providers}
            oauthOnly={providerOnly}
            onComplete={() => Router.push('/')}
            onSignIn={showSignIn}
          />
        )}
      </AuthShell>
    </>
  );
};

export default Login;

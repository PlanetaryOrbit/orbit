import AuthShell from '@/components/auth/AuthShell';
import AccountStep from '@/components/setup/AccountStep';
import { DEFAULT_ACCENT, STEP_COUNT } from '@/components/setup/constants';
import OpenCloudStep from '@/components/setup/OpenCloudStep';
import type { AccountValues } from '@/components/setup/types';
import WorkspaceStep from '@/components/setup/WorkspaceStep';
import { loginState } from '@/state';
import { getRGBFromTailwindColor } from '@/utils/themeColor';
import axios from 'axios';
import type { NextPage } from 'next';
import Head from 'next/head';
import Router from 'next/router';
import { useState } from 'react';
import { toast } from 'react-hot-toast';
import { useSetRecoilState } from 'recoil';

const SETUP_TIMEOUT_MS = 30000;

const Welcome: NextPage = () => {
  const setLogin = useSetRecoilState(loginState);
  const [step, setStep] = useState(0);
  const [accent, setAccent] = useState(DEFAULT_ACCENT);
  const [groupId, setGroupId] = useState('');
  const [openCloudKey, setOpenCloudKey] = useState('');
  const [setupToken, setSetupToken] = useState('');

  const createAccount = async ({
    username,
    password,
    setupToken: token,
  }: AccountValues): Promise<string | null> => {
    try {
      const { data } = await axios.post(
        '/api/setupworkspace',
        {
          groupid: groupId,
          username,
          password,
          color: accent,
          ...(openCloudKey ? { opencloudKey: openCloudKey } : {}),
          ...(token ? { setupToken: token } : {}),
        },
        {
          timeout: SETUP_TIMEOUT_MS,
          ...(token ? { headers: { 'x-setup-token': token } } : {}),
        },
      );

      if (data.success) {
        toast.success('Instance setup completed.');
        setLogin((previous) => ({ ...previous, ...data.user, isOwner: true }));
        await Router.replace('/');
      }

      return null;
    } catch (error) {
      if (!axios.isAxiosError(error)) {
        toast.error('An error occurred. Please try again.');
        return null;
      }

      if (error.response?.status === 404) {
        toast.error('Username not found');
        return error.response.data?.error ?? 'Username not found';
      }

      if (error.response?.status === 403) {
        toast.error('Workspace already exists');
      } else if (error.code === 'ECONNABORTED') {
        toast.error('Request timed out. Please try again.');
      } else {
        toast.error('An error occurred. Please try again.');
      }

      return null;
    }
  };

  return (
    <>
      <Head>
        <title>Welcome · Orbit</title>
      </Head>

      <AuthShell
        accentRgb={getRGBFromTailwindColor(accent)}
        description='Set up your instance in a few quick steps.'
        contentKey={step}
        progress={{ current: step, total: STEP_COUNT }}
      >
        {step === 0 && (
          <WorkspaceStep
            groupId={groupId}
            accent={accent}
            onAccentChange={setAccent}
            onContinue={(id) => {
              setGroupId(id);
              setStep(1);
            }}
          />
        )}

        {step === 1 && (
          <OpenCloudStep
            savedKey={openCloudKey}
            setupToken={setupToken}
            onBack={() => setStep(0)}
            onContinue={(key, token) => {
              setOpenCloudKey(key);
              setSetupToken(token);
              setStep(2);
            }}
          />
        )}

        {step === 2 && (
          <AccountStep
            onBack={() => setStep(1)}
            onCreate={createAccount}
          />
        )}
      </AuthShell>
    </>
  );
};

export default Welcome;

import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import toast from 'react-hot-toast';

const PROVIDER_LABELS: Record<string, string> = {
  discord: 'Discord',
  google: 'Google',
};

type LinkResult = {
  action?: string;
  linked?: string;
  error?: string;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function showLinkResult({ action, linked, error }: LinkResult) {
  const provider = linked && PROVIDER_LABELS[linked];

  if (provider) return toast.success(`${provider} connected`);
  if (action === 'linked') return toast.success('Account linked');
  if (action) return toast.error('Error signing in.');
  if (error) return toast.error('Something went wrong while updating your account.');
}

export function useAccountLinkToast() {
  const router = useRouter();
  const handled = useRef(false);

  useEffect(() => {
    if (!router.isReady || handled.current) return;

    const { action, linked, error, ...query } = router.query;
    if (!action && !linked && !error) return;

    handled.current = true;
    showLinkResult({ action: first(action), linked: first(linked), error: first(error) });
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [router]);
}

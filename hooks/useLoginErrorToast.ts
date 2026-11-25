import { useRouter } from 'next/router';
import { useEffect, useRef } from 'react';
import { toast } from 'react-hot-toast';

const LOGIN_ERRORS: Record<string, string> = {
  'discord-not-linked': "This account isn't linked to any Orbit account.",
  'google-not-linked': 'Your Google account is not linked.',
  'state-mismatch': 'We detected a state mismatch, OAuth process was discontinued.',
  missing_params: 'Not enough params were provided.',
  'unauthorized-domain': 'This domain is not allowed to sign in.',
};

const DEFAULT_LOGIN_ERROR = 'There was an error while logging in.';

export function useLoginErrorToast() {
  const router = useRouter();
  const shown = useRef(false);

  useEffect(() => {
    if (!router.isReady || shown.current) return;

    const { error, ...query } = router.query;
    if (!error) return;

    shown.current = true;
    toast.error(LOGIN_ERRORS[String(error)] ?? DEFAULT_LOGIN_ERROR);
    router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  }, [router]);
}

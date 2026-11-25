import type { ChangelogRelease } from '@/components/help/changelog';
import axios from 'axios';
import { useEffect, useState } from 'react';

export type VersionInfo = {
  current: string;
  latest: string | null;
  outdated: boolean;
  changelog: ChangelogRelease[];
  loading: boolean;
};

const INITIAL_INFO: VersionInfo = {
  current: '',
  latest: null,
  outdated: false,
  changelog: [],
  loading: true,
};

export function useVersionInfo() {
  const [info, setInfo] = useState(INITIAL_INFO);

  useEffect(() => {
    const controller = new AbortController();

    axios
      .get<Omit<VersionInfo, 'loading'>>('/api/version', { signal: controller.signal })
      .then(({ data }) => {
        setInfo({
          ...data,
          changelog: Array.isArray(data.changelog) ? data.changelog : [],
          loading: false,
        });
      })
      .catch((error) => {
        if (axios.isCancel(error)) return;

        console.error('[HELP] Failed to fetch Orbit version:', error);
        setInfo((previous) => ({ ...previous, loading: false }));
      });

    return () => controller.abort();
  }, []);

  return info;
}

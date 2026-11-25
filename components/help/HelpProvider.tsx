import { useVersionInfo } from '@/hooks/useVersionInfo';
import type { VersionInfo } from '@/hooks/useVersionInfo';
import { createContext, useContext, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

import ChangelogDialog from './ChangelogDialog';
import LicensingDialog from './LicensingDialog';

type HelpContextValue = {
  version: VersionInfo;
  openChangelog: () => void;
  openCopyright: () => void;
};

const noop = () => {};

const HelpContext = createContext<HelpContextValue>({
  version: { current: '', latest: null, outdated: false, changelog: [], loading: true },
  openChangelog: noop,
  openCopyright: noop,
});

export function useHelp() {
  return useContext(HelpContext);
}

export function HelpProvider({ children }: { children: ReactNode }) {
  const version = useVersionInfo();
  const [changelogOpen, setChangelogOpen] = useState(false);
  const [copyrightOpen, setCopyrightOpen] = useState(false);

  const value = useMemo(
    () => ({
      version,
      openChangelog: () => setChangelogOpen(true),
      openCopyright: () => setCopyrightOpen(true),
    }),
    [version],
  );

  return (
    <HelpContext.Provider value={value}>
      {children}

      <ChangelogDialog
        open={changelogOpen}
        onClose={() => setChangelogOpen(false)}
        releases={version.changelog}
        loading={version.loading}
      />
      <LicensingDialog
        open={copyrightOpen}
        onClose={() => setCopyrightOpen(false)}
      />
    </HelpContext.Provider>
  );
}

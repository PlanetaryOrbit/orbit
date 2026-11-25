import { DEFAULT_THEME_RGB } from '@/utils/themeColor';
import axios from 'axios';
import { useEffect, useState } from 'react';

type LoginAppearance = {
  loaded: boolean;
  accentRgb: string;
  background: { url: string; tint: number } | null;
};

const INITIAL_APPEARANCE: LoginAppearance = {
  loaded: false,
  accentRgb: DEFAULT_THEME_RGB,
  background: null,
};

export function useLoginAppearance() {
  const [appearance, setAppearance] = useState(INITIAL_APPEARANCE);

  useEffect(() => {
    let active = true;

    axios
      .get('/api/instance/login-background')
      .then(({ data }) => {
        if (!active) return;

        const tintEnabled = data.tintEnabled ?? true;
        const tintOpacity = data.tintOpacity ?? 60;

        setAppearance({
          loaded: true,
          accentRgb: data.themeRgb ?? DEFAULT_THEME_RGB,
          background: data.backgroundUrl
            ? { url: data.backgroundUrl, tint: tintEnabled ? tintOpacity / 100 : 0 }
            : null,
        });
      })
      .catch(() => {
        if (active) setAppearance({ ...INITIAL_APPEARANCE, loaded: true });
      });

    return () => {
      active = false;
    };
  }, []);

  return appearance;
}

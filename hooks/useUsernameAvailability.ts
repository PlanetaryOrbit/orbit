import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';

export type Availability = {
  status: 'idle' | 'checking' | 'available' | 'unavailable';
  message?: string;
};

const MIN_USERNAME_LENGTH = 2;

export function useUsernameAvailability(delayMs = 800) {
  const [availability, setAvailability] = useState<Availability>({ status: 'idle' });
  const timeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const latestRequest = useRef(0);

  useEffect(() => () => clearTimeout(timeout.current), []);

  const check = useCallback(
    (username: string) => {
      clearTimeout(timeout.current);
      const requestId = ++latestRequest.current;

      if (username.length < MIN_USERNAME_LENGTH) {
        setAvailability({ status: 'idle' });
        return;
      }

      setAvailability({ status: 'checking' });

      timeout.current = setTimeout(async () => {
        let result: Availability = { status: 'available' };

        try {
          await axios.post('/api/auth/checkUsername', { username });
        } catch (error) {
          const message = axios.isAxiosError(error) ? error.response?.data?.error : undefined;
          result = message ? { status: 'unavailable', message } : { status: 'idle' };
        }

        if (requestId === latestRequest.current) setAvailability(result);
      }, delayMs);
    },
    [delayMs],
  );

  return { availability, check };
}

import axios from 'axios';
import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';

export type Session = {
  id: string;
  browser: string | null;
  os: string | null;
  device: string | null;
  ipAddress: string | null;
  createdAt: string;
  isCurrent: boolean;
  region?: string;
  country?: string;
};

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      const { data } = await axios.get('/api/user/sessions');
      setSessions(data.sessions ?? []);
    } catch {
      toast.error('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  const revoke = async (id: string) => {
    try {
      await axios.delete(`/api/user/sessions/${id}`);
      setSessions((current) => current.filter((session) => session.id !== id));
      toast.success('Session revoked');
    } catch {
      toast.error('Failed to revoke session');
    }
  };

  const revokeOthers = async () => {
    try {
      await axios.delete('/api/user/sessions');
      setSessions((current) => current.filter((session) => session.isCurrent));
      toast.success('Signed out of other sessions');
    } catch {
      toast.error('Failed to sign out other sessions');
    }
  };

  return { sessions, loading, refresh, revoke, revokeOthers };
}

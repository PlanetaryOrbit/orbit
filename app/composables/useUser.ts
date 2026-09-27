import type { FetchError } from 'ofetch';
import type { ApiResponse, User } from '~~/shared/types';

export function useUser() {
  const user = useState<User | undefined | null>('user', () => undefined);
  const requestFetch = useRequestFetch();

  async function refreshUser() {
    try {
      const response = await requestFetch<ApiResponse<User>>('/api/v1/@me');

      if (!response.success) {
        user.value = null;
        return;
      }

      user.value = response.data;
    } catch (error) {
      const fetchError = error as FetchError;

      if (fetchError.statusCode === 401 || fetchError.statusCode === 404) {
        user.value = null;
        return;
      }

      console.error('Failed to fetch authenticated user:', error);
      user.value = null;
    }
  }

  return {
    user,
    refreshUser,
  };
}

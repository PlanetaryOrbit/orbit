import type { ApiResponse, User } from '~/utils/types';

export function useUser() {
  const user = useState<User | null>('user', () => null);

  async function refreshUser() {
    try {
      const response = await $fetch<ApiResponse<User>>('/api/v1/@me');

      if (!response.success) {
        user.value = null;
        return;
      }

      user.value = response.data;
    } catch (error) {
      console.error('Failed to fetch authenticated user:', error);
      user.value = null;
    }
  }

  return {
    user,
    refreshUser,
  };
}

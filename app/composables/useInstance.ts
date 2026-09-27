import type { ApiResponse, Instance } from '~~/shared/types';

export function useInstance() {
  const settings = useState<Instance>('instance-settings');

  async function refreshSettings() {
    try {
      const response = await $fetch<ApiResponse<Instance>>('/api/v1/instance');

      if (!response.success) {
        throw new Error(response.error.message);
      }

      settings.value = response.data;
    } catch (error) {
      console.error('Failed to fetch instance settings:', error);
      throw error;
    }
  }

  return {
    settings,
    refreshSettings,
  };
}

import type { ApiResponse, Instance } from '~~/shared/types';

export function useInstance() {
  const settings = useState<Instance | null>('instance-settings', () => null);
  const toast = useToast();

  async function refreshSettings() {
    try {
      const response = await $fetch<ApiResponse<Instance>>('/api/v1/instance');

      if (!response.success) {
        toast.error(response.error.message);
        return;
      }

      settings.value = response.data;
      toast.success('Instance settings refreshed successfully.');
    } catch (error) {
      console.error('Failed to refresh instance settings:', error);
      toast.error('Failed to refresh instance settings.');
    }
  }

  return {
    settings,
    refreshSettings,
  };
}

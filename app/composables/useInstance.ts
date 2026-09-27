import type { ApiResponse, Instance } from '~~/shared/types';

export function useInstance() {
  const settings = useState<Instance>('instance-settings');
  const initialized = useState<boolean>('instance-settings-initialized', () => false);

  async function refreshSettings() {
    const response = await $fetch<ApiResponse<Instance>>('/api/v1/instance');
    if (!response.success) {
      throw new Error(response.error.message);
    }
    settings.value = response.data;
    initialized.value = true;
  }

  return {
    settings,
    initialized,
    refreshSettings,
  };
}

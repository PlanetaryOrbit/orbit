import type { ApiResponse, Instance } from '~~/shared/types';

export function useInstance() {
  const settings = useState<Instance | null | undefined>('instance-settings', () => undefined);

  async function refreshSettings() {
    const response = await $fetch<ApiResponse<Instance>>('/api/v1/instance');

    if (!response.success) {
      throw new Error(response.error.message);
    }

    settings.value = response.data;
  }

  return {
    settings,
    refreshSettings,
  };
}

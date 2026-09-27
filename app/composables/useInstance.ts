import type { ApiResponse, Instance } from '~~/shared/types';

export function useInstance() {
  const state = useState<Instance | null>('instance-settings', () => null);
  const toast = useToast();

  async function refreshSettings() {
    try {
      const response = await $fetch<ApiResponse<Instance>>('/api/v1/instance');

      if (!response.success) {
        toast.error(response.error.message);
        return;
      }

      state.value = response.data;
    } catch (error) {
      console.error('Failed to fetch instance settings:', error);
      toast.error('Failed to fetch instance settings.');
    }
  }

  const settings = new Proxy({} as Instance, {
    get(_, property) {
      if (!state.value) {
        throw new Error('Instance settings have not been loaded.');
      }

      return Reflect.get(state.value, property);
    },
  });

  return {
    settings,
    refreshSettings,
  };
}

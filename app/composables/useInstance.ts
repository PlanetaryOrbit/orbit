import type { InstanceSettings } from '~/utils/types';

export const DEFAULTS: InstanceSettings = {
  id: '',
  name: 'Orbit',
  logoUrl: '/favicon.png',
  allowPasswordAuth: true,
  allowRobloxAuth: false,
  enableRegistration: true,
  primaryColor: '#fb019c',
  darkBackground: '/orbitbackground-dark.svg',
  lightBackground: '/orbitbackground-light.svg',
  isSetup: false,
  createdAt: new Date(0).toISOString(),
  updatedAt: new Date(0).toISOString(),
};

export function useInstance() {
  const settings = useState<InstanceSettings>('instance-settings', () => DEFAULTS);

  const toast = useToast();

  async function refreshSettings() {
    try {
      const response = await $fetch<{
        success: boolean;
        data?: InstanceSettings;
        error?: {
          message?: string;
        };
      }>('/api/v1/instance');
      if (!response.success || !response.data) {
        toast.error(response.error?.message ?? 'Failed to refresh instance settings.');
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

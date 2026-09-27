import { getSettings } from '~~/server/lib/instance';
import type { ApiResponse, Instance } from '~~/shared/types';

export default defineEventHandler(async (): Promise<ApiResponse<Instance>> => {
  const settings = await getSettings();

  return {
    success: true,
    data: settings,
  };
});

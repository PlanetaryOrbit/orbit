import { h } from 'vue';
import { toast as sonner } from 'vue-sonner';

import Toast from '~/components/Toast.vue';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

export function useToast() {
  function show(message: string, type: ToastType = 'info') {
    return sonner.custom(
      () =>
        h(Toast, {
          message,
          type,
        }),
      {
        duration: type === 'loading' ? Infinity : 5000,
      },
    );
  }

  return {
    show,

    success: (message: string) => show(message, 'success'),
    error: (message: string) => show(message, 'error'),
    info: (message: string) => show(message, 'info'),
    warning: (message: string) => show(message, 'warning'),
    loading: (message: string) => show(message, 'loading'),

    dismiss: (id?: string | number) => sonner.dismiss(id),
  };
}
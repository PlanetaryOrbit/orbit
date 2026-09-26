<script setup lang="ts">
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconInfoCircle,
  IconLoader2,
} from '@tabler/icons-vue';
type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';
const props = withDefaults(defineProps<{ message: string; type?: ToastType }>(), { type: 'info' });
const icons = {
  success: IconCircleCheck,
  error: IconCircleX,
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  loading: IconLoader2,
};
const Icon = icons[props.type];
const isAssertive = props.type === 'error' || props.type === 'warning';
</script>
<template>
  <div
    class="toast"
    :class="`toast--${type}`"
    :role="isAssertive ? 'alert' : 'status'"
    :aria-live="isAssertive ? 'assertive' : 'polite'"
    aria-atomic="true"
  >
    <div class="toast__icon" aria-hidden="true">
      <component :is="Icon" class="toast__icon-svg" />
    </div>
    <p class="toast__message">{{ message }}</p>
  </div>
</template>

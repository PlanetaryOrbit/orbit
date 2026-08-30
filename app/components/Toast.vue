<script setup lang="ts">
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconCircleX,
  IconInfoCircle,
  IconLoader2,
  IconX,
} from '@tabler/icons-vue';

type ToastType = 'success' | 'error' | 'info' | 'warning' | 'loading';

const props = withDefaults(
  defineProps<{
    message: string;
    type?: ToastType;
  }>(),
  {
    type: 'info',
  },
);

const icons = {
  success: IconCircleCheck,
  error: IconCircleX,
  info: IconInfoCircle,
  warning: IconAlertTriangle,
  loading: IconLoader2,
};

const colors = {
  success: {
    icon: 'text-ctp-green',
    bg: 'bg-ctp-green/10',
  },
  error: {
    icon: 'text-ctp-red',
    bg: 'bg-ctp-red/10',
  },
  info: {
    icon: 'text-ctp-blue',
    bg: 'bg-ctp-blue/10',
  },
  warning: {
    icon: 'text-ctp-yellow',
    bg: 'bg-ctp-yellow/10',
  },
  loading: {
    icon: 'text-ctp-blue',
    bg: 'bg-ctp-blue/10',
  },
};

const Icon = icons[props.type];
const color = colors[props.type];
</script>

<template>
  <div
    class="pointer-events-auto flex w-96 items-start gap-3 rounded-2xl border border-ctp-surface0 bg-ctp-mantle/90 p-4 font-sans shadow-2xl backdrop-blur-xl"
    :role="type === 'error' || type === 'warning' ? 'alert' : 'status'"
    :aria-live="type === 'error' || type === 'warning' ? 'assertive' : 'polite'"
    aria-atomic="true"
  >
    <div
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
      :class="color.bg"
      aria-hidden="true"
    >
      <component
        :is="Icon"
        class="h-5 w-5"
        :class="[color.icon, { 'animate-spin': type === 'loading' }]"
      />
    </div>

    <p class="min-w-0 flex-1 pt-2 text-sm text-ctp-text">
      {{ message }}
    </p>
  </div>
</template>

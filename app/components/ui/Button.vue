<script setup lang="ts">
import { IconRotateClockwise } from '@tabler/icons-vue';
import type { Component } from 'vue';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: Component;
  iconSrc?: string;
  href?: string;
  iconOnly?: boolean;
  ariaLabel?: string;
  type?: 'button' | 'submit' | 'reset';
  disabled?: boolean;
  class?: string;
}

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'ghost',
  size: 'md',
  loading: false,
  iconOnly: false,
  type: 'button',
  disabled: false,
});

const variants: Record<ButtonVariant, string> = {
  primary: [
    'border border-ctp-instance',
    'bg-ctp-instance',
    'text-ctp-instance-text',
    'shadow-sm',
    'hover:border-ctp-instance-secondary',
    'hover:bg-ctp-instance-secondary',
    'hover:shadow-lg',
  ].join(' '),

  secondary: [
    'border border-ctp-surface1',
    'bg-ctp-surface0/70',
    'backdrop-blur-sm',
    'text-ctp-text',
    'shadow-sm',
    'hover:border-ctp-surface2',
    'hover:bg-ctp-surface1',
    'hover:shadow-lg',
  ].join(' '),

  ghost: [
    'border border-transparent',
    'bg-transparent',
    'text-ctp-subtext1',
    'hover:bg-ctp-surface0',
    'hover:text-ctp-text',
  ].join(' '),

  danger: [
    'border border-ctp-red',
    'bg-ctp-red',
    'text-ctp-base',
    'shadow-sm',
    'hover:bg-ctp-maroon',
    'hover:border-ctp-maroon',
    'hover:shadow-lg',
  ].join(' '),
};

const sizes: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 text-sm',
  md: 'min-h-10 px-4 text-sm',
  lg: 'min-h-12 px-5 text-base',
};

const iconSizes: Record<ButtonSize, string> = {
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const isDisabled = computed(() => props.disabled || props.loading);

const buttonClass = computed(() =>
  [
    'group',
    'inline-flex',
    'items-center',
    'justify-center',
    props.iconOnly ? 'aspect-square p-0' : props.size === 'lg' ? 'gap-2' : 'gap-1.5',
    'rounded-xl',
    'font-medium',
    'leading-none',
    'select-none',
    'whitespace-nowrap',
    'cursor-pointer',
    'touch-manipulation',
    'transition-all',
    'duration-150',
    'ease-out',
    'motion-safe:hover:-translate-y-0.5',
    'motion-safe:active:translate-y-0',
    'focus-visible:outline-none',
    'focus-visible:ring-2',
    'focus-visible:ring-ctp-instance/70',
    'focus-visible:ring-offset-2',
    'focus-visible:ring-offset-ctp-crust',
    'disabled:pointer-events-none',
    'disabled:cursor-not-allowed',
    'disabled:opacity-50',
    'disabled:saturate-50',
    'disabled:shadow-none',
    'disabled:translate-y-0',
    props.iconOnly
      ? sizes[props.size]
          .split(' ')
          .filter((x) => x.startsWith('min-h'))
          .join(' ')
      : sizes[props.size],
    variants[props.variant],
    props.class,
  ]
    .filter(Boolean)
    .join(' '),
);

const iconClass = computed(() => iconSizes[props.size]);
</script>

<template>
  <NuxtLink
    v-if="href"
    :to="href"
    :class="buttonClass"
    :aria-label="iconOnly ? ariaLabel : undefined"
    :aria-disabled="isDisabled || undefined"
    :tabindex="isDisabled ? -1 : undefined"
  >
    <span
      v-if="loading || icon || iconSrc"
      class="inline-flex shrink-0 items-center justify-center leading-none"
    >
      <Transition
        enter-active-class="transition duration-150"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <IconRotateClockwise
          v-if="loading"
          :class="[iconClass, 'animate-spin']"
          aria-hidden="true"
        />

        <NuxtImg
          v-else-if="iconSrc"
          :src="iconSrc"
          alt=""
          :class="iconClass"
          :width="24"
          :height="24"
        />

        <component :is="icon" v-else-if="icon" :class="iconClass" aria-hidden="true" />
      </Transition>
    </span>

    <span v-if="!iconOnly" class="inline-flex items-center leading-none">
      <slot />
    </span>
  </NuxtLink>

  <button
    v-else
    :type="type"
    :disabled="isDisabled"
    :class="buttonClass"
    :aria-label="iconOnly ? ariaLabel : undefined"
    :aria-busy="loading || undefined"
  >
    <span
      v-if="loading || icon || iconSrc"
      class="inline-flex shrink-0 items-center justify-center leading-none"
    >
      <Transition
        enter-active-class="transition duration-150"
        enter-from-class="opacity-0 scale-90"
        enter-to-class="opacity-100 scale-100"
        leave-active-class="transition duration-100"
        leave-from-class="opacity-100 scale-100"
        leave-to-class="opacity-0 scale-90"
      >
        <IconRotateClockwise
          v-if="loading"
          :class="[iconClass, 'animate-spin']"
          aria-hidden="true"
        />

        <NuxtImg
          v-else-if="iconSrc"
          :src="iconSrc"
          alt=""
          :class="iconClass"
          :width="24"
          :height="24"
        />

        <component :is="icon" v-else-if="icon" :class="iconClass" aria-hidden="true" />
      </Transition>
    </span>

    <span v-if="!iconOnly" class="inline-flex items-center leading-none">
      <slot />
    </span>
  </button>
</template>

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
const isDisabled = computed(() => props.disabled || props.loading);
</script>
<template>
  <NuxtLink
    v-if="href"
    :to="href"
    :class="[
      'orbit-button',
      `orbit-button--${variant}`,
      `orbit-button--${size}`,
      { 'orbit-button--icon-only': iconOnly },
      { 'orbit-button--loading': loading },
      { 'orbit-button--disabled': isDisabled },
      props.class,
    ]"
    :aria-label="iconOnly ? ariaLabel : undefined"
    :aria-disabled="isDisabled || undefined"
    :tabindex="isDisabled ? -1 : undefined"
  >
    <span v-if="loading || icon || iconSrc" class="orbit-button__icon" aria-hidden="true">
      <IconRotateClockwise
        v-if="loading"
        class="orbit-button__icon-svg orbit-button__icon-svg--loading"
      />
      <NuxtImg
        v-else-if="iconSrc"
        :src="iconSrc"
        alt=""
        class="orbit-button__icon-svg"
        width="24"
        height="24"
      />
      <component :is="icon" v-else-if="icon" class="orbit-button__icon-svg" />
    </span>
    <span v-if="!iconOnly" class="orbit-button__label"> <slot /> </span>
  </NuxtLink>
  <button
    v-else
    :type="type"
    :disabled="isDisabled"
    :class="[
      'orbit-button',
      `orbit-button--${variant}`,
      `orbit-button--${size}`,
      { 'orbit-button--icon-only': iconOnly },
      { 'orbit-button--loading': loading },
      props.class,
    ]"
    :aria-label="iconOnly ? ariaLabel : undefined"
    :aria-busy="loading || undefined"
  >
    <span v-if="loading || icon || iconSrc" class="orbit-button__icon" aria-hidden="true">
      <IconRotateClockwise
        v-if="loading"
        class="orbit-button__icon-svg orbit-button__icon-svg--loading"
      />
      <NuxtImg
        v-else-if="iconSrc"
        :src="iconSrc"
        alt=""
        class="orbit-button__icon-svg"
        width="24"
        height="24"
      />
      <component :is="icon" v-else-if="icon" class="orbit-button__icon-svg" />
    </span>
    <span v-if="!iconOnly" class="orbit-button__label"> <slot /> </span>
  </button>
</template>

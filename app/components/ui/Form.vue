<script setup lang="ts">
import { IconAlertCircle } from '@tabler/icons-vue';
withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    error?: string;
  }>(),
  {
    title: undefined,
    description: undefined,
    error: undefined,
  },
);

defineEmits<{
  submit: [event: SubmitEvent];
}>();
</script>

<template>
  <form class="orbit-form" novalidate @submit="$emit('submit', $event)">
    <header v-if="title || description" class="orbit-form__header">
      <h2 v-if="title" class="orbit-form__title">
        {{ title }}
      </h2>

      <p v-if="description" class="orbit-form__description">
        {{ description }}
      </p>
    </header>

    <div v-if="error" class="orbit-form__error" role="alert" aria-live="assertive">
      <IconAlertCircle class="orbit-form__error-icon" aria-hidden="true" />

      <span class="orbit-form__error-message">
        {{ error }}
      </span>
    </div>

    <fieldset class="orbit-form__fields">
      <slot />
    </fieldset>

    <div v-if="$slots.actions" class="orbit-form__actions">
      <slot name="actions" />
    </div>
  </form>
</template>

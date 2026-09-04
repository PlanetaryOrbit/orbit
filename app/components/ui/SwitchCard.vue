<script setup lang="ts">
import type { Component } from 'vue';

interface Props {
  icon: Component;
  title: string;
  description?: string;
  enabled: boolean;
}

defineProps<Props>();

const model = defineModel<boolean>();
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center justify-between rounded-xl border p-3 transition-all duration-200"
    :class="model ? 'border-ctp-instance bg-ctp-instance/10' : 'border-ctp-surface1 bg-ctp-crust'"
    :aria-pressed="model"
    @click="model = !model"
  >
    <div class="flex items-center gap-3 text-left">
      <component
        :is="icon"
        :size="20"
        :stroke-width="2"
        class="h-5 w-5 text-ctp-subtext0"
        aria-hidden="true"
      />

      <div>
        <p class="text-sm font-medium text-ctp-text">
          {{ title }}
        </p>

        <p v-if="description" class="mt-0.5 text-xs text-ctp-subtext0">
          {{ description }}
        </p>
      </div>
    </div>

    <div
      class="flex h-6 w-11 shrink-0 items-center rounded-full p-1 transition-colors duration-200"
      :class="model ? 'justify-end bg-ctp-instance' : 'justify-start bg-ctp-surface1'"
    >
      <div class="h-4 w-4 rounded-full bg-ctp-text shadow-sm transition-transform duration-200" />
    </div>
  </button>
</template>

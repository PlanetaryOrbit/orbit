<script setup lang="ts">
import type { Component } from 'vue';

interface Props {
  label: string;
  placeholder?: string;
  icon?: Component;
}

defineProps<Props>();

const model = defineModel<string>();
</script>

<template>
  <div>
    <label class="mb-2 block text-sm font-medium text-ctp-subtext1">
      {{ label }}
    </label>

    <div
      class="flex h-11 items-center rounded-xl border border-ctp-surface1 bg-ctp-crust px-3 transition focus-within:border-ctp-instance"
    >
      <component
        :is="icon"
        v-if="icon"
        :size="20"
        :stroke-width="2"
        class="mr-2 h-5 w-5 shrink-0 text-ctp-subtext0"
        aria-hidden="true"
      />

      <input
        v-model="model"
        :placeholder="placeholder"
        class="flex-1 bg-transparent text-sm text-ctp-text outline-none placeholder:text-ctp-overlay0"
      />
    </div>
  </div>
</template>

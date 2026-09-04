<script setup lang="ts">
defineProps<{
  label: string;
  placeholder?: string;
}>();

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
      <span class="mr-2 h-5 w-5 text-ctp-subtext0" aria-hidden="true" />

      <input
        v-model="model"
        :placeholder="placeholder ?? '#89b4fa'"
        class="flex-1 bg-transparent text-sm uppercase text-ctp-text outline-none placeholder:text-ctp-overlay0"
      />

      <label
        class="relative ml-3 h-7 w-7 cursor-pointer overflow-hidden rounded-lg border border-ctp-surface1"
      >
        <input
          v-model="model"
          type="color"
          class="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />

        <span class="block h-full w-full" :style="{ backgroundColor: model }" />
      </label>
    </div>
  </div>
</template>

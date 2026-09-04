<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    label: string;
    placeholder?: string;
    alt?: string;
  }>(),
  {
    placeholder: 'Image URL',
    alt: 'Preview',
  },
);

const model = defineModel<string>();

const error = ref(false);

watch(model, () => {
  error.value = false;
});
</script>

<template>
  <div>
    <label class="mb-2 block text-sm font-medium text-ctp-subtext1">
      {{ props.label }}
    </label>

    <div class="grid grid-cols-[1fr_auto] gap-3">
      <div
        class="flex h-11 items-center rounded-xl border border-ctp-surface1 bg-ctp-crust px-3 transition focus-within:border-ctp-instance"
      >
        <span class="mr-2 h-5 w-5 text-ctp-subtext0" aria-hidden="true" />

        <input
          v-model="model"
          :placeholder="props.placeholder"
          class="w-full bg-transparent text-sm text-ctp-text outline-none placeholder:text-ctp-overlay0"
        />
      </div>

      <div
        class="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-ctp-surface1 bg-ctp-crust"
      >
        <img
          v-if="model && !error"
          :src="model"
          :alt="props.alt"
          class="h-full w-full object-contain"
          @error="error = true"
        />

        <span v-else class="h-5 w-5 text-ctp-overlay0" aria-hidden="true" />
      </div>
    </div>
  </div>
</template>

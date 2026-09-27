<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    modelValue?: string | number;
    label?: string;
    description?: string;
    error?: string;
    type?: string;
    name?: string;
    placeholder?: string;
    autocomplete?: string;
    inputmode?: 'none' | 'text' | 'decimal' | 'numeric' | 'tel' | 'search' | 'email' | 'url';
    required?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    invalid?: boolean;
    minlength?: number;
    maxlength?: number;
    pattern?: string;
  }>(),
  {
    modelValue: '',
    label: undefined,
    description: undefined,
    error: undefined,
    type: 'text',
    name: undefined,
    placeholder: undefined,
    autocomplete: undefined,
    inputmode: undefined,
    required: false,
    disabled: false,
    readonly: false,
    invalid: false,
    minlength: undefined,
    maxlength: undefined,
    pattern: undefined,
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  input: [event: Event];
  change: [event: Event];
  blur: [event: FocusEvent];
  focus: [event: FocusEvent];
}>();

const inputId = useId();
const descriptionId = `${inputId}-description`;
const errorId = `${inputId}-error`;

const describedBy = computed(() => {
  const ids: string[] = [];

  if (props.description && !props.error) {
    ids.push(descriptionId);
  }

  if (props.error) {
    ids.push(errorId);
  }

  return ids.length > 0 ? ids.join(' ') : undefined;
});

const isInvalid = computed(() => props.invalid || Boolean(props.error));

function handleInput(event: Event) {
  const target = event.target as HTMLInputElement;

  emit('update:modelValue', target.value);
  emit('input', event);
}
</script>

<template>
  <div
    class="orbit-input"
    :class="{
      'orbit-input--invalid': isInvalid,
      'orbit-input--disabled': disabled,
      'orbit-input--readonly': readonly,
    }"
  >
    <label v-if="label" class="orbit-input__label" :for="inputId">
      <span class="orbit-input__label-text">
        {{ label }}
      </span>

      <span v-if="required" class="orbit-input__required" aria-hidden="true">*</span>

      <span v-if="required" class="sr-only">required</span>
    </label>

    <div class="orbit-input__control">
      <input
        :id="inputId"
        class="orbit-input__field"
        :class="{
          'orbit-input__field--invalid': isInvalid,
          'orbit-input__field--has-end': $slots.end,
        }"
        :type="type"
        :name="name"
        :value="modelValue"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :inputmode="inputmode"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :minlength="minlength"
        :maxlength="maxlength"
        :pattern="pattern"
        :aria-invalid="isInvalid || undefined"
        :aria-describedby="describedBy"
        @input="handleInput"
        @change="$emit('change', $event)"
        @blur="$emit('blur', $event)"
        @focus="$emit('focus', $event)"
      />

      <div v-if="$slots.end" class="orbit-input__end">
        <slot name="end" />
      </div>
    </div>

    <p v-if="description && !error" :id="descriptionId" class="orbit-input__description">
      {{ description }}
    </p>

    <p v-if="error" :id="errorId" class="orbit-input__error" role="alert">
      {{ error }}
    </p>

    <slot name="after" />
  </div>
</template>

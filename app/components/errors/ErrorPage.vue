<script setup lang="ts">
import { IconAlertTriangle, IconHome, IconSearch } from '@tabler/icons-vue';

import Button from '../ui/Button.vue';
const { t } = useI18n();

const props = withDefaults(
  defineProps<{
    statusCode: number;
    title: string;
    message: string;
  }>(),
  {
    statusCode: 500,
  },
);

const isNotFound = computed(() => props.statusCode === 404);
</script>

<template>
  <main class="error-page">
    <div class="error-page__content">
      <p class="error-page__code">
        {{ statusCode }}
      </p>

      <h1 class="error-page__title">
        {{ title }}
      </h1>

      <p class="error-page__message">
        {{ message }}
      </p>

      <div class="error-page__actions">
        <Button variant="primary" size="lg" :icon="IconHome" href="/">{{
          t('common.actions.home')
        }}</Button>

        <Button
          v-if="isNotFound"
          variant="ghost"
          size="lg"
          :icon="IconSearch"
          @click="$router.back()"
        >
          {{ t('common.actions.back') }}
        </Button>
      </div>
    </div>
  </main>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app';
import ErrorPage from '~/components/errors/ErrorPage.vue';

const props = defineProps<{
  error: NuxtError;
}>();
const { t } = useI18n();
const isNotFound = computed(() => props.error.status === 404);
const title = computed(() =>
  isNotFound.value ? t('errors.notFound.title') : t('errors.somethingWentWrong.title'),
);

const message = computed(() =>
  isNotFound.value ? t('errors.notFound.message') : t('errors.somethingWentWrong.message'),
);
</script>

<template>
  <ErrorPage :status-code="error.status ?? 500" :title="title" :message="message" />
</template>

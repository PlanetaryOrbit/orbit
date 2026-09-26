<script setup lang="ts">
import type { NuxtError } from '#app';
import ErrorPage from '~/components/errors/ErrorPage.vue';

const props = defineProps<{
  error: NuxtError;
}>();

const isNotFound = computed(() => props.error.status === 404);

const title = computed(() => (isNotFound.value ? 'Page not found' : 'Something went wrong'));

const message = computed(() =>
  isNotFound.value
    ? "The page you're looking for doesn't exist or may have been moved."
    : 'Orbit encountered an unexpected error while loading this page.',
);
</script>

<template>
  <ErrorPage :status-code="error.status ?? 500" :title="title" :message="message" />
</template>

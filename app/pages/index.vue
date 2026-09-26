<script setup lang="ts">
import Button from '~/components/ui/Button.vue';
import { useToast } from '~/composables/useToast';

const toast = useToast();

function showToast() {
  toast.success('Hello, World!');
}
</script>
<template>
  <Button variant="primary" @click="showToast()">Show Toast</Button>
</template>

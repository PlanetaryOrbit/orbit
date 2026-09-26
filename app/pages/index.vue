<script setup lang="ts">
import { IconLock, IconUserPlus } from '@tabler/icons-vue';

import Button from '~/components/ui/Button.vue';

const { user } = useUser();

const hasPermission = true;
const hasWorkspaces = true;
</script>

<template>
  <div v-if="!user" class="error-page">
    <div class="error-page__content">
      <span class="error-page__code">401</span>
      <h1 class="error-page__title">No Access!</h1>
      <p class="error-page__message">You need to sign in to view this page.</p>
      <div class="error-page__actions">
        <Button variant="primary" size="lg" :icon="IconUserPlus" href="/login"> Sign in </Button>
      </div>
    </div>
  </div>

  <div v-else-if="!hasPermission" class="error-page">
    <div class="error-page__content">
      <span class="error-page__code">403</span>
      <h1 class="error-page__title">Access Denied</h1>
      <p class="error-page__message">You don't have permission to access this page.</p>
      <div class="error-page__actions">
        <Button variant="ghost" size="lg" href="/"> Go home </Button>
      </div>
    </div>
  </div>

  <div v-else-if="!hasWorkspaces" class="error-page">
    <div class="error-page__content">
      <span class="error-page__code">—</span>
      <h1 class="error-page__title">No Workspaces</h1>
      <p class="error-page__message">You don't have access to any workspaces yet.</p>
      <div class="error-page__actions">
        <Button variant="ghost" size="lg" href="/"> Go home </Button>
      </div>
    </div>
  </div>

  <div v-else>
    <h1>Pick a workspace</h1>
  </div>
</template>

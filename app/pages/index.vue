<script setup lang="ts">
import { IconLock, IconUserPlus } from '@tabler/icons-vue';

import Button from '~/components/ui/Button.vue';

const { user } = useUser();

const hasPermission = true;
const hasWorkspaces = true;
const { t } = useI18n();
</script>

<template>
  <div v-if="!user" class="error-page">
    <div class="error-page__content">
      <span class="error-page__code">401</span>
      <h1 class="error-page__title">{{ t('errors.unauthorized.title') }}</h1>
      <p class="error-page__message">{{ t('errors.unauthorized.message') }}</p>
      <div class="error-page__actions">
        <Button variant="primary" size="lg" :icon="IconUserPlus" href="/login">{{
          t('auth.login')
        }}</Button>
      </div>
    </div>
  </div>

  <div v-else-if="!hasPermission" class="error-page">
    <div class="error-page__content">
      <span class="error-page__code">403</span>
      <h1 class="error-page__title">{{ t('errors.forbidden.title') }}</h1>
      <p class="error-page__message">{{ t('errors.forbidden.message') }}</p>
      <div class="error-page__actions">
        <Button variant="ghost" size="lg" href="/">{{ t('actions.common.back') }}</Button>
      </div>
    </div>
  </div>

  <div v-else-if="!hasWorkspaces" class="error-page">
    <div class="error-page__content">
      <span class="error-page__code">—</span>
      <h1 class="error-page__title">{{ t('errors.noWorkspaces.title') }}</h1>
      <p class="error-page__message">{{ t('errors.noWorkspaces.message') }}</p>
      <div class="error-page__actions">
        <Button variant="ghost" size="lg" href="/">{{ t('actions.common.back') }}</Button>
      </div>
    </div>
  </div>

  <div v-else>
    <h1>Pick a workspace</h1>
  </div>
</template>

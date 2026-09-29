<script setup lang="ts">
import { IconArrowRight, IconPlus, IconRefresh } from '@tabler/icons-vue';

import Button from '~/components/ui/Button.vue';
import { useToast } from '~/composables/useToast';

const { user } = useUser();
const { settings } = useInstance();
const { t } = useI18n();
const toast = useToast();

const syncing = ref(false);

const hasPermission = true;
const hasWorkspaces = true;

async function sync() {
  syncing.value = true;

  try {
    await new Promise((resolve) => setTimeout(resolve, 3000));

    toast.success('Roles synced successfully.');
  } catch {
    toast.error('Failed to sync roles.');
  } finally {
    syncing.value = false;
  }
}
</script>

<template>
  <div v-if="!user" class="error-page">
    <div class="error-page__content">
      <span class="error-page__code">401</span>
      <h1 class="error-page__title">{{ t('errors.unauthorized.title') }}</h1>
      <p class="error-page__message">{{ t('errors.unauthorized.message') }}</p>

      <div class="error-page__actions">
        <Button variant="primary" size="lg" href="/login">
          {{ t('common.actions.login') }}
        </Button>
      </div>
    </div>
  </div>

  <div v-else-if="!hasPermission" class="error-page">
    <div class="error-page__content">
      <span class="error-page__code">403</span>
      <h1 class="error-page__title">{{ t('errors.forbidden.title') }}</h1>
      <p class="error-page__message">{{ t('errors.forbidden.message') }}</p>

      <div class="error-page__actions">
        <Button variant="ghost" size="lg" href="/" :icon="IconArrowRight">
          {{ t('common.actions.back') }}
        </Button>
      </div>
    </div>
  </div>

  <div v-else-if="!hasWorkspaces" class="error-page">
    <div class="error-page__content">
      <span class="error-page__code">204</span>
      <h1 class="error-page__title">{{ t('errors.noWorkspaces.title') }}</h1>
      <p class="error-page__message">{{ t('errors.noWorkspaces.message') }}</p>

      <div class="error-page__actions">
        <Button variant="ghost" size="lg" href="/" :icon="IconArrowRight">
          {{ t('common.actions.back') }}
        </Button>
      </div>
    </div>
  </div>

  <main v-else class="home">
    <div class="home__container">
      <header class="home__header">
        <div class="home__heading">
          <h1 class="home__title">
            {{ t('pages.home.greeting', { username: user.username }) }}
          </h1>

          <p class="home__description">
            {{ t('pages.home.description') }}
          </p>
        </div>

        <div class="home__header-actions">
          <Button
            variant="secondary"
            size="sm"
            :icon="IconRefresh"
            @click="sync"
            :loading="syncing"
          >
            {{ t('pages.home.workspaces.syncRoles') }}
          </Button>

          <Button variant="primary" size="sm" :icon="IconPlus">
            {{ t('pages.home.workspaces.create') }}
          </Button>
        </div>
      </header>

      <section class="home__workspaces" aria-labelledby="workspaces-title">
        <div class="home__section-header">
          <div>
            <h2 id="workspaces-title" class="home__section-title">
              {{ t('pages.home.workspaces.title') }}
            </h2>

            <p class="home__section-description">
              {{ t('pages.home.workspaces.count', { count: 1 }) }}
            </p>
          </div>
        </div>

        <div class="home__workspace-list">
          <article class="home__workspace">
            <div class="home__workspace-main">
              <div class="home__workspace-icon">
                <img
                  v-if="settings.logoUrl"
                  :src="settings.logoUrl"
                  :alt="settings.name"
                  width="48"
                  height="48"
                />

                <span v-else aria-hidden="true">
                  {{ settings.name.charAt(0).toUpperCase() }}
                </span>
              </div>

              <div class="home__workspace-info">
                <h3 class="home__workspace-name">Test Workspace</h3>
                <p class="home__workspace-description">meow meow meow meow</p>
              </div>

              <Button variant="primary" size="sm" href="/workspace/test" :icon="IconArrowRight">
                {{ t('common.actions.open') }}
              </Button>
            </div>

            <div class="home__workspace-meta">
              <div class="home__workspace-stat">
                <span class="home__workspace-stat-value">12</span>
                <span class="home__workspace-stat-label">
                  {{ t('pages.home.workspace.roles', 12) }}
                </span>
              </div>

              <div class="home__workspace-stat">
                <span class="home__workspace-stat-value">6</span>
                <span class="home__workspace-stat-label">
                  {{ t('pages.home.workspace.members', 6) }}
                </span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>
</template>

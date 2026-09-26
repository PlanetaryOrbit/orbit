<script setup lang="ts">
import { IconMoon, IconSun, IconUserPlus } from '@tabler/icons-vue';
import { Toaster } from 'vue-sonner';

import Button from '~/components/ui/Button.vue';

const { isDark, toggle } = useTheme();
const { settings } = useInstance();
const user = null;

const authBackground = computed(() => {
  return isDark.value
    ? (settings.value.darkBackground ?? settings.value.lightBackground)
    : (settings.value.lightBackground ?? settings.value.darkBackground);
});
</script>

<template>
  <NuxtLayout>
    <header class="orbit-header">
      <div class="orbit-header__inner">
        <NuxtLink to="/" :aria-label="settings.name" class="orbit-header__brand">
          <img
            :src="settings.logoUrl"
            :alt="settings.name"
            width="40"
            height="40"
            class="orbit-header__logo"
            loading="eager"
            fetchpriority="high"
          />

          <span class="orbit-header__name">
            {{ settings.name }}
          </span>
        </NuxtLink>

        <nav class="orbit-header__actions" aria-label="Main navigation">
          <Button
            variant="ghost"
            size="md"
            aria-label="Toggle theme"
            icon-only
            :icon="isDark ? IconSun : IconMoon"
            @click="toggle"
          />

          <template v-if="user">
            <!-- use thing -->
          </template>

          <template v-else>
            <Button v-if="settings.allowPasswordAuth" variant="ghost" href="/login">
              Log in
            </Button>

            <Button
              v-if="settings.enableRegistration"
              variant="primary"
              href="/signup"
              :icon="IconUserPlus"
            >
              Sign Up
            </Button>
          </template>
        </nav>
      </div>
    </header>

    <main>
      <div v-if="!authBackground" class="orbit-background" />

      <img v-else :src="authBackground" alt="" class="orbit-background" />

      <div class="page">
        <NuxtPage />
      </div>
    </main>
  </NuxtLayout>

  <Toaster
    position="bottom-right"
    :offset="24"
    :toast-options="{
      unstyled: true,
    }"
  />
</template>

<script setup lang="ts">
import { IconMoon, IconSun, IconUserPlus } from '@tabler/icons-vue';
import { Toaster } from 'vue-sonner';

import Button from '~/components/ui/Button.vue';

const { isDark, toggle } = useTheme();
const { settings } = useInstance();
const user = null;
</script>

<template>
  <NuxtLayout>
    <header
      class="sticky top-0 z-50 border-b border-ctp-surface0 bg-ctp-crust/80 backdrop-blur-xl select-none"
    >
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <NuxtLink to="/" :aria-label="settings.name" class="flex items-center gap-3">
          <img
            :src="settings.logoUrl"
            :alt="settings.name"
            width="40"
            height="40"
            class="h-10 w-10 object-contain"
            loading="eager"
            fetchpriority="high"
          />

          <span class="text-lg font-semibold text-ctp-text">
            {{ settings.name }}
          </span>
        </NuxtLink>

        <div class="flex items-center gap-3">
          <Button
            variant="ghost"
            size="md"
            aria-label="Toggle theme"
            icon-only
            :icon="isDark ? IconSun : IconMoon"
            @click="toggle"
          />

          <div v-if="user">
            <!-- User menu -->
          </div>

          <div v-else class="flex items-center gap-3">
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
          </div>
        </div>
      </div>
    </header>

    <main class="relative z-0 min-h-screen overflow-hidden bg-ctp-base">
      <NuxtPage />
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

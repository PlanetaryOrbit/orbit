<script setup lang="ts">
import { IconMoon, IconSun, IconUserPlus } from '@tabler/icons-vue';
import { Toaster } from 'vue-sonner';

import Button from '~/components/ui/Button.vue';

const { isDark, toggle } = useTheme();

const user = null;
</script>

<template>
  <NuxtLayout>
    <header
      class="sticky top-0 z-50 border-b border-ctp-surface0 bg-ctp-crust/80 backdrop-blur-xl select-none"
    >
      <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <NuxtLink to="/">
          <img
            src="/planetary.svg"
            alt="Planetary"
            width="125"
            height="60"
            class="h-[60px] w-[125px]"
            loading="eager"
            fetchpriority="high"
          />
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
            <!-- nothing -->
          </div>

          <div v-else class="flex items-center gap-3">
            <Button variant="ghost" href="/login">Log in</Button>

            <Button variant="primary" href="/signup" :icon="IconUserPlus">Sign Up</Button>
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

<script setup lang="ts">
import { IconLanguage } from '@tabler/icons-vue';
import { Toaster } from 'vue-sonner';

import Button from '~/components/ui/Button.vue';
import Dropdown from '~/components/ui/Dropdown.vue';

const { isDark } = useTheme();
const { settings } = useInstance();
const { user, refreshUser } = useUser();
const { t, locale, locales } = useI18n();
const switchLocalePath = useSwitchLocalePath();

await refreshUser();

const instanceBackground = computed(() => {
  return isDark.value
    ? (settings.value.darkBackground ?? settings.value.lightBackground)
    : (settings.value.lightBackground ?? settings.value.darkBackground);
});

const i18nHead = useLocaleHead({
  dir: true,
  lang: true,
});

const currentLocale = computed(() => locales.value.find((item) => item.code === locale.value));

const languageItems = computed(() =>
  locales.value.map((item) => ({
    label: item.name,
    value: item.code,
    flag: item.flag,
    selected: item.code === locale.value,
    onSelect: async () => {
      await navigateTo(switchLocalePath(item.code));
    },
  })),
);

useHead(() => ({
  htmlAttrs: {
    dir: i18nHead.value.htmlAttrs.dir,
    lang: i18nHead.value.htmlAttrs.lang,
  },
  titleTemplate: (pageTitle) =>
    pageTitle ? `${pageTitle} - ${settings.value.name}` : settings.value.name,
  link: [
    {
      rel: 'icon',
      type: 'image/png',
      href: settings.value.logoUrl,
    },
  ],
}));
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

        <nav class="orbit-header__actions" :aria-label="t('common.navigation.actions')">
          <Dropdown :items="languageItems" align="end" :trigger-label="t('common.language')">
            <template #trigger>
              <span
                v-if="currentLocale?.flag"
                :class="['fi', `fi-${currentLocale.flag}`]"
                aria-hidden="true"
              />

              <IconLanguage v-else class="orbit-button__icon-svg" aria-hidden="true" />

              <span>{{ currentLocale?.name }}</span>
            </template>
          </Dropdown>

          <template v-if="user">
            <!-- user thing -->
          </template>

          <template v-else>
            <Button v-if="settings.allowPasswordAuth" variant="ghost" href="/login">
              {{ t('auth.login') }}
            </Button>

            <Button v-if="settings.enableRegistration" variant="primary" href="/signup">
              {{ t('auth.signup') }}
            </Button>
          </template>
        </nav>
      </div>
    </header>

    <main>
      <div v-if="!instanceBackground" class="orbit-background" />
      <img v-else :src="instanceBackground" alt="" class="orbit-background" />

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

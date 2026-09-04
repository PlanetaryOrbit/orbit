<script setup lang="ts">
import { IconBuilding, IconUserPlus, IconLock } from '@tabler/icons-vue';
import { computed, ref, watch } from 'vue';
import { useRouter } from 'vue-router';

import Button from '~/components/ui/Button.vue';
import ColorInput from '~/components/ui/ColorInput.vue';
import FormInput from '~/components/ui/FormInput.vue';
import InputWithPreview from '~/components/ui/InputWithPreview.vue';
import SwitchCard from '~/components/ui/SwitchCard.vue';

const router = useRouter();

const { data: user } = await useFetch('/api/v1/auth/me');
const { data: settings } = await useFetch('/api/v1/instance/settings');

const loading = ref(false);

const name = ref(settings.value?.name ?? 'Orbit');
const logoUrl = ref(settings.value?.logoUrl ?? '/favicon.png');
const primaryColor = ref(settings.value?.primaryColor ?? '#fb019c');

const allowPasswordAuth = ref(settings.value?.allowPasswordAuth ?? true);

const enableRegistration = ref(settings.value?.enableRegistration ?? true);

watch(
  primaryColor,
  (color) => {
    document.documentElement.style.setProperty('--instance-primary', color);
  },
  {
    immediate: true,
  },
);

const canSetup = computed(() => {
  return user.value?.isOwner === true;
});

watch(
  [user, canSetup],
  ([currentUser]) => {
    if (!currentUser) {
      router.replace('/signup');
      return;
    }

    if (!currentUser.isOwner) {
      router.replace('/');
    }
  },
  { immediate: true },
);

async function handleSubmit() {
  loading.value = true;

  try {
    const response = await $fetch('/api/v1/setup/instance_settings', {
      method: 'POST',
      body: {
        name: name.value,
        logoUrl: logoUrl.value,
        primaryColor: primaryColor.value,
        allowPasswordAuth: allowPasswordAuth.value,
        enableRegistration: enableRegistration.value,
        done: true,
      },
    });

    if (!response.success) {
      console.error(response.error);
      return;
    }

    await router.replace('/');
  } catch (error) {
    console.error('Failed to save instance settings:', error);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="relative z-10 flex min-h-screen flex-col lg:flex-row">
    <section class="flex flex-1 items-center px-8 py-16 lg:px-20">
      <div class="max-w-lg">
        <h1 class="text-5xl font-bold tracking-tight text-ctp-text">
          Let's get your
          <span class="text-ctp-instance">Orbit</span>
          instance setup!
        </h1>

        <p class="mt-5 max-w-md text-lg leading-relaxed text-ctp-subtext0">
          A modern, open-source staff management platform for Roblox groups.
        </p>
      </div>
    </section>

    <section class="flex flex-1 items-center justify-center px-6 py-12">
      <div
        class="w-full max-w-md rounded-3xl border border-ctp-surface0 bg-ctp-mantle/80 p-8 shadow-2xl backdrop-blur-xl"
      >
        <h2 class="text-2xl font-bold text-ctp-text">Setup</h2>

        <p class="mt-2 text-sm text-ctp-subtext0">Configure your Orbit instance settings.</p>

        <form class="mt-6 space-y-5" @submit.prevent="handleSubmit">
          <FormInput
            v-model="name"
            label="Instance Name"
            placeholder="Orbit"
            :icon="IconBuilding"
          />

          <InputWithPreview
            v-model="logoUrl"
            label="Logo"
            placeholder="https://example.com/logo.png"
          />

          <ColorInput v-model="primaryColor" label="Primary Color" />

          <div>
            <label class="mb-2 block text-sm font-medium text-ctp-subtext1">Authentication</label>

            <div class="space-y-3">
              <SwitchCard
                v-model="allowPasswordAuth"
                title="Password Authentication"
                description="Allow users to sign in using a password."
                :icon="IconLock"
              />

              <SwitchCard
                v-model="enableRegistration"
                title="Enable Registration"
                description="Allow new users to create accounts."
                :icon="IconUserPlus"
              />
            </div>
          </div>

          <Button variant="primary" className="w-full mb-0" type="submit" :loading="loading">
            Complete Setup
          </Button>

          <p class="text-sm text-ctp-subtext1">You can change these settings later.</p>
        </form>
      </div>
    </section>
  </div>
</template>

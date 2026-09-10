<script setup lang="ts">
import {
  IconBrandDiscord,
  IconCheck,
  IconCopy,
  IconEye,
  IconEyeOff,
  IconUser,
  IconUserPlus,
  IconLock,
} from '@tabler/icons-vue';
import { nextTick, computed, ref } from 'vue';

import Button from '~/components/ui/Button.vue';
import FormInput from '~/components/ui/FormInput.vue';
import { calculatePasswordStrength } from '~/utils/passwordStrength';

const { settings } = useInstance();

const step = ref<'signup' | 'verify'>('signup');
const username = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');
const signupId = ref('');
const verification = ref<{
  code: string;
  expiresAt: string;
} | null>(null);
const robloxUser = ref<{
  username: string;
  displayName: string;
  avatar: string;
} | null>(null);
const copied = ref(false);
const showPassword = ref(false);

const registrationEnabled = computed(() => settings.value.enableRegistration);
const passwordAuthEnabled = computed(() => settings.value.allowPasswordAuth);
const robloxAuthEnabled = computed(() => settings.value.allowRobloxAuth);
const hasAuthMethod = computed(() => passwordAuthEnabled.value || robloxAuthEnabled.value);
const hasBothAuthMethods = computed(() => passwordAuthEnabled.value && robloxAuthEnabled.value);

const passwordStrength = computed(() => {
  if (!password.value) {
    return {
      score: 0 as const,
      label: 'Weak' as const,
    };
  }

  return calculatePasswordStrength(password.value);
});

const passwordStrengthScore = computed(() => passwordStrength.value.score);

const passwordStrengthLabel = computed(() => {
  return passwordStrength.value.label;
});

const passwordStrengthId = 'password-strength';
const errorId = 'signup-error';

const instanceName = computed(() => settings.value.name || 'Orbit');

const description = computed(() => {
  if (hasBothAuthMethods.value) {
    return 'Create an account with a username and password, or continue with Roblox.';
  }

  if (passwordAuthEnabled.value) {
    return 'Create your account with a username and password.';
  }

  if (robloxAuthEnabled.value) {
    return 'Create your account using your Roblox account.';
  }

  return 'Account registration is currently unavailable.';
});

const expiresAt = computed(() => {
  if (!verification.value?.expiresAt) return '';

  const date = new Date(verification.value.expiresAt);

  if (Number.isNaN(date.getTime())) return '';

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
});

function resetSignup() {
  step.value = 'signup';
  username.value = '';
  password.value = '';
  error.value = '';
  signupId.value = '';
  verification.value = null;
  robloxUser.value = null;
  copied.value = false;
  showPassword.value = false;
}

async function handleSignup() {
  if (loading.value) return;

  error.value = '';

  if (!username.value.trim() || !password.value) {
    error.value = 'Please enter a username and password.';
    return;
  }

  loading.value = true;

  try {
    const response = await $fetch<{
      success: boolean;
      data?: {
        signupId: string;
        verification: {
          code: string;
          expiresAt: string;
        };
        robloxUser: {
          username: string;
          displayName: string;
          avatar: string;
        };
      };
      error?: {
        code?: string;
        message?: string;
      };
    }>('/api/v1/auth/signup/start', {
      method: 'POST',
      body: {
        username: username.value.trim(),
        password: password.value,
      },
    });

    if (!response.success || !response.data) {
      if (response.error?.code === 'ACCOUNT_EXISTS') {
        await navigateTo('/login');
        return;
      }

      error.value = response.error?.message ?? 'Unable to create your account.';
      return;
    }

    signupId.value = response.data.signupId;
    verification.value = response.data.verification;
    robloxUser.value = response.data.robloxUser;
    step.value = 'verify';

    await nextTick();

    document.getElementById('verification-heading')?.focus();
  } catch (err) {
    console.error('Signup failed:', err);
    error.value = 'Something went wrong while creating your account.';
  } finally {
    loading.value = false;
  }
}

async function handleVerify() {
  if (loading.value || !signupId.value) return;

  error.value = '';
  loading.value = true;

  try {
    const response = await $fetch<{
      success: boolean;
      data?: {
        isFirst?: boolean;
      };
      error?: {
        message?: string;
      };
    }>('/api/v1/auth/signup/verify', {
      method: 'POST',
      body: {
        signupId: signupId.value,
      },
    });

    if (!response.success) {
      error.value = response.error?.message ?? 'Your Roblox account could not be verified.';
      return;
    }

    if (response.data?.isFirst) {
      await navigateTo('/setup');
      return;
    }

    await navigateTo('/');
  } catch (err) {
    console.error('Verification failed:', err);
    error.value = 'Something went wrong while verifying your account.';
  } finally {
    loading.value = false;
  }
}

async function copyVerificationCode() {
  if (!verification.value?.code) return;

  try {
    await navigator.clipboard.writeText(verification.value.code);
    copied.value = true;

    window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    error.value = 'Unable to copy the verification code.';
  }
}
</script>

<template>
  <div
    class="mx-auto flex w-full max-w-6xl items-center px-4 py-8 sm:px-6 lg:min-h-[calc(100vh-4rem)] lg:py-12"
  >
    <div
      class="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(420px,520px)] lg:items-center lg:gap-16"
    >
      <section class="hidden lg:block">
        <div class="max-w-xl">
          <h1 class="text-4xl font-bold tracking-tight text-ctp-text xl:text-5xl">
            Welcome to <span class="text-ctp-instance font-bold">{{ instanceName }}</span>
          </h1>

          <p class="mt-5 max-w-lg text-lg leading-8 text-ctp-subtext0">
            Create your account to get started.
          </p>
        </div>
      </section>

      <main
        class="w-full rounded-2xl border border-ctp-surface0 bg-ctp-mantle p-6 shadow-xl sm:p-8"
        aria-labelledby="signup-heading"
      >
        <template v-if="step === 'signup'">
          <div class="mb-8">
            <h2
              id="signup-heading"
              class="text-2xl font-bold tracking-tight text-ctp-text sm:text-3xl"
            >
              Create your account
            </h2>

            <p class="mt-2 text-sm leading-6 text-ctp-subtext0">
              {{ description }}
            </p>
          </div>

          <div
            v-if="!registrationEnabled"
            class="rounded-xl border border-ctp-surface0 bg-ctp-base p-5"
          >
            <div class="flex gap-4">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ctp-surface0 text-ctp-subtext0"
                aria-hidden="true"
              >
                <IconUser :size="22" />
              </div>

              <div>
                <h3 class="font-semibold text-ctp-text">Registration is disabled</h3>

                <p class="mt-1 text-sm leading-6 text-ctp-subtext0">
                  New accounts cannot currently be created on this instance.
                </p>
              </div>
            </div>
          </div>

          <div
            v-else-if="!hasAuthMethod"
            class="rounded-xl border border-ctp-surface0 bg-ctp-base p-5"
          >
            <div class="flex gap-4">
              <div
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ctp-surface0 text-ctp-subtext0"
                aria-hidden="true"
              >
                <IconUser :size="22" />
              </div>

              <div>
                <h3 class="font-semibold text-ctp-text">No sign-up methods are available</h3>

                <p class="mt-1 text-sm leading-6 text-ctp-subtext0">
                  An administrator needs to enable at least one authentication method before
                  accounts can be created.
                </p>
              </div>
            </div>
          </div>

          <form
            v-else-if="passwordAuthEnabled"
            class="space-y-5"
            novalidate
            @submit.prevent="handleSignup"
          >
            <div>
              <FormInput
                v-model="username"
                label="Username"
                name="username"
                type="text"
                autocomplete="username"
                placeholder="Choose a username"
                :disabled="loading"
                required
                :icon="IconUser"
              />
            </div>

            <div>
              <FormInput
                v-model="password"
                label="Password"
                name="password"
                autocomplete="new-password"
                placeholder="Create a password"
                :disabled="loading"
                :icon="IconLock"
                type="password"
                required
              />

              <div v-if="password" :id="passwordStrengthId" class="mt-3" aria-live="polite">
                <div class="mb-2 flex items-center justify-between gap-4">
                  <span class="text-xs font-medium text-ctp-subtext0"> Password strength </span>

                  <span
                    class="text-xs font-medium"
                    :class="
                      passwordStrengthScore >= 3
                        ? 'text-ctp-green'
                        : passwordStrengthScore >= 2
                          ? 'text-ctp-yellow'
                          : 'text-ctp-red'
                    "
                  >
                    {{ passwordStrengthLabel }}
                  </span>
                </div>

                <div
                  class="flex gap-1.5"
                  role="progressbar"
                  aria-label="Password strength"
                  :aria-valuenow="passwordStrengthScore"
                  aria-valuemin="0"
                  aria-valuemax="4"
                  :aria-valuetext="passwordStrengthLabel"
                >
                  <span
                    v-for="index in 4"
                    :key="index"
                    class="h-1.5 flex-1 rounded-full transition-colors"
                    :class="
                      index <= passwordStrengthScore
                        ? passwordStrengthScore >= 3
                          ? 'bg-ctp-green'
                          : passwordStrengthScore >= 2
                            ? 'bg-ctp-yellow'
                            : 'bg-ctp-red'
                        : 'bg-ctp-surface0'
                    "
                  />
                </div>
              </div>
            </div>

            <p
              v-if="error"
              :id="errorId"
              class="rounded-lg border border-ctp-red/30 bg-ctp-red/10 px-3 py-2.5 text-sm leading-5 text-ctp-red"
              role="alert"
            >
              {{ error }}
            </p>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              class="w-full"
              :loading="loading"
              :disabled="!passwordStrengthScore || username.trim() === '' || password.trim() === ''"
              :icon="IconUserPlus"
            >
              Create account
            </Button>

            <div v-if="hasBothAuthMethods" class="flex items-center gap-3 py-1" aria-hidden="true">
              <div class="h-px flex-1 bg-ctp-surface0" />
              <span class="text-xs font-medium uppercase tracking-wider text-ctp-overlay1">
                or
              </span>
              <div class="h-px flex-1 bg-ctp-surface0" />
            </div>

            <Button
              v-if="hasBothAuthMethods"
              type="button"
              variant="secondary"
              size="lg"
              class="w-full"
              :icon="IconBrandDiscord"
              :disabled="loading"
            >
              Continue with Roblox
            </Button>
          </form>

          <div v-else-if="robloxAuthEnabled" class="space-y-5">
            <div class="rounded-xl border border-ctp-surface0 bg-ctp-base p-5">
              <div class="flex gap-4">
                <div
                  class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ctp-surface0 text-ctp-text"
                  aria-hidden="true"
                >
                  <IconBrandDiscord :size="22" />
                </div>

                <div>
                  <h3 class="font-semibold text-ctp-text">Continue with Roblox</h3>

                  <p class="mt-1 text-sm leading-6 text-ctp-subtext0">
                    Use your Roblox account to create an account on
                    {{ instanceName }}.
                  </p>
                </div>
              </div>
            </div>

            <Button
              type="button"
              variant="primary"
              size="lg"
              class="w-full"
              :icon="IconBrandDiscord"
              :disabled="loading"
            >
              Continue with Roblox
            </Button>

            <p
              v-if="error"
              :id="errorId"
              class="rounded-lg border border-ctp-red/30 bg-ctp-red/10 px-3 py-2.5 text-sm leading-5 text-ctp-red"
              role="alert"
            >
              {{ error }}
            </p>
          </div>

          <p class="mt-6 text-center text-sm text-ctp-subtext0">
            Already have an account?
            <NuxtLink
              to="/login"
              class="font-medium text-ctp-instance underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctp-instance focus-visible:ring-offset-2 focus-visible:ring-offset-ctp-mantle"
            >
              Sign in
            </NuxtLink>
          </p>
        </template>

        <template v-else>
          <div class="mb-8">
            <div
              class="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-ctp-instance/10 text-ctp-instance"
              aria-hidden="true"
            >
              <IconCheck :size="26" stroke-width="2" />
            </div>

            <h2
              id="verification-heading"
              tabindex="-1"
              class="text-2xl font-bold tracking-tight text-ctp-text outline-none sm:text-3xl"
            >
              Verify your Roblox account
            </h2>

            <p class="mt-2 text-sm leading-6 text-ctp-subtext0">
              Add the verification code below to your Roblox profile bio, then verify your account.
            </p>
          </div>

          <div
            v-if="robloxUser"
            class="mb-6 flex items-center gap-4 rounded-xl border border-ctp-surface0 bg-ctp-base p-4"
          >
            <img
              :src="robloxUser.avatar"
              :alt="`${robloxUser.displayName}'s Roblox avatar`"
              width="56"
              height="56"
              class="h-14 w-14 shrink-0 rounded-xl object-cover"
            />

            <div class="min-w-0">
              <p class="truncate font-semibold text-ctp-text">
                {{ robloxUser.displayName }}
              </p>

              <p class="truncate text-sm text-ctp-subtext0">@{{ robloxUser.username }}</p>
            </div>
          </div>

          <div class="space-y-5">
            <div>
              <div class="mb-2 flex items-center justify-between gap-3">
                <span class="text-sm font-medium text-ctp-text"> Verification code </span>

                <button
                  type="button"
                  class="inline-flex min-h-11 items-center gap-2 rounded-lg px-2.5 text-sm font-medium text-ctp-subtext0 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctp-instance focus-visible:ring-offset-2 focus-visible:ring-offset-ctp-mantle"
                  :aria-label="copied ? 'Verification code copied' : 'Copy verification code'"
                  :disabled="!verification?.code"
                  @click="copyVerificationCode"
                >
                  <IconCheck v-if="copied" :size="18" aria-hidden="true" />
                  <IconCopy v-else :size="18" aria-hidden="true" />
                  <span>{{ copied ? 'Copied' : 'Copy' }}</span>
                </button>
              </div>

              <button
                type="button"
                class="group w-full rounded-xl border border-ctp-surface0 bg-ctp-base p-5 text-left transition-colors hover:border-ctp-instance/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctp-instance focus-visible:ring-offset-2 focus-visible:ring-offset-ctp-mantle"
                aria-label="Copy verification code"
                @click="copyVerificationCode"
              >
                <code
                  class="block break-all text-center font-mono text-2xl font-bold tracking-[0.2em] text-ctp-instance sm:text-3xl"
                >
                  {{ verification?.code }}
                </code>
              </button>
            </div>

            <div class="rounded-xl border border-ctp-surface0 bg-ctp-base px-4 py-3 text-sm">
              <p class="text-ctp-subtext0">
                This code expires
                <span class="font-medium text-ctp-text">
                  {{ expiresAt || 'soon' }}
                </span>
                .
              </p>
            </div>

            <p
              v-if="error"
              :id="errorId"
              class="rounded-lg border border-ctp-red/30 bg-ctp-red/10 px-3 py-2.5 text-sm leading-5 text-ctp-red"
              role="alert"
            >
              {{ error }}
            </p>

            <Button
              type="button"
              variant="primary"
              size="lg"
              class="w-full"
              :loading="loading"
              :disabled="loading"
              :icon="IconCheck"
              @click="handleVerify"
            >
              Verify account
            </Button>

            <button
              type="button"
              class="min-h-11 w-full rounded-lg px-3 text-sm font-medium text-ctp-subtext0 transition-colors hover:bg-ctp-surface0 hover:text-ctp-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ctp-instance focus-visible:ring-offset-2 focus-visible:ring-offset-ctp-mantle"
              :disabled="loading"
              @click="resetSignup"
            >
              Use a different account
            </button>
          </div>
        </template>
      </main>
    </div>
  </div>
</template>

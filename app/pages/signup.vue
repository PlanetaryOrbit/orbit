<script setup lang="ts">
import {
  IconArrowLeft,
  IconArrowRight,
  IconCheck,
  IconCopy,
  IconEye,
  IconEyeClosed,
  IconUserPlus,
} from '@tabler/icons-vue';
import { computed, ref } from 'vue';
import type { ApiResponse, User } from '~~/shared/types';
const router = useRouter();
const { user, refreshUser } = useUser();
if (user) {
  router.push('/');
}

import Button from '~/components/ui/Button.vue';
import Form from '~/components/ui/Form.vue';
import Input from '~/components/ui/Input.vue';
import { useInstance } from '~/composables/useInstance';
import { calculatePasswordStrength } from '~/utils/passwordStrength';

const { t } = useI18n();
const { settings } = useInstance();

useHead({
  title: t('common.actions.signup'),
});

type SignupResponse = {
  signupId: string;
  user: {
    id: string;
    username: string;
    displayName: string;
    avatar: string | null;
  };
  verification: {
    type: 'roblox_bio';
    code: string;
    expiresAt: string;
  };
};

const username = ref('');
const password = ref('');
const showPassword = ref(false);

const step = ref(1);
const loading = ref(false);
const error = ref<string | null>(null);
const copied = ref(false);

const signup = ref<SignupResponse | null>(null);

const passwordStrength = computed(() => calculatePasswordStrength(password.value));

const passwordStrengthLabel = computed(() => {
  if (!password.value) {
    return '';
  }

  return t(`common.labels.passwords.${passwordStrength.value}`);
});

const passwordStrengthPercentage = computed(() => {
  if (!password.value) {
    return 0;
  }

  return (Number(passwordStrength.value) / 4) * 100;
});

async function startSignup() {
  error.value = null;
  loading.value = true;

  try {
    const response = await $fetch<ApiResponse<SignupResponse>>('/api/v1/auth/signup/start', {
      method: 'POST',
      body: {
        username: username.value,
        password: password.value,
      },
    });

    if (!response.success) {
      error.value = response.error.message;
      return;
    }

    signup.value = response.data;
    step.value = 2;
  } catch (err) {
    const fetchError = err as {
      data?: {
        code?: string;
        message?: string;
      };
      statusMessage?: string;
    };

    error.value =
      fetchError.data?.message ?? fetchError.statusMessage ?? t('common.errors.generic');
  } finally {
    loading.value = false;
  }
}

function goBack() {
  error.value = null;
  copied.value = false;
  step.value = 1;
}

async function copyCode() {
  if (!signup.value) {
    return;
  }

  try {
    await navigator.clipboard.writeText(signup.value.verification.code);
    copied.value = true;

    window.setTimeout(() => {
      copied.value = false;
    }, 2000);
  } catch {
    copied.value = false;
  }
}

async function continueSignup() {
  if (!signup.value || loading.value) {
    return;
  }

  error.value = null;
  loading.value = true;

  try {
    const response = await $fetch<ApiResponse<{ user: User; isFirst: boolean }>>(
      '/api/v1/auth/signup/verify',
      {
        method: 'POST',
        body: {
          signupId: signup.value.signupId,
        },
      },
    );

    if (!response.success) {
      error.value = response.error.message;
      return;
    }

    await refreshUser();

    await router.push('/');
  } catch (err) {
    const fetchError = err as {
      data?: {
        code?: string;
        message?: string;
      };
      statusMessage?: string;
    };

    error.value =
      fetchError.data?.message ?? fetchError.statusMessage ?? t('pages.signup.error.generic');
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="signup">
    <section class="signup__intro" aria-labelledby="signup-title">
      <div class="signup__intro-inner">
        <h1 id="signup-title" class="signup__title">
          {{ t('pages.signup.intro.title') }}
          <span class="signup__title-accent">
            {{ settings.name }}
          </span>
        </h1>

        <p class="signup__description">
          {{ t('pages.signup.intro.description', { name: settings.name }) }}
        </p>
      </div>
    </section>

    <section
      class="signup__form"
      :aria-labelledby="step === 1 ? 'signup-form-title' : 'signup-verification-title'"
    >
      <span class="signup__divider" aria-hidden="true" />

      <div class="signup__form-inner">
        <template v-if="step === 1">
          <header class="signup__form-header">
            <h2 id="signup-form-title" class="signup__form-title">
              {{ t('pages.signup.form.title') }}
            </h2>

            <p class="signup__form-description">
              {{ t('pages.signup.form.description') }}
            </p>
          </header>

          <Form @submit.prevent="startSignup" :error="error">
            <Input
              v-model="username"
              :label="t('pages.signup.form.fields.username.label')"
              name="username"
              autocomplete="username"
              :placeholder="t('pages.signup.form.fields.username.placeholder')"
              required
              :disabled="loading"
            />

            <Input
              v-model="password"
              :label="t('pages.signup.form.fields.password.label')"
              name="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="new-password"
              :placeholder="t('pages.signup.form.fields.password.placeholder')"
              required
              :disabled="loading"
            >
              <template #end>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  icon-only
                  :aria-label="
                    showPassword
                      ? t('pages.signup.form.actions.hidePassword')
                      : t('pages.signup.form.actions.showPassword')
                  "
                  :icon="showPassword ? IconEyeClosed : IconEye"
                  :disabled="loading"
                  @click="showPassword = !showPassword"
                />
              </template>

              <template #after>
                <div
                  class="signup__password-strength"
                  :data-strength="passwordStrength"
                  aria-live="polite"
                >
                  <div
                    class="signup__password-strength-bar"
                    role="progressbar"
                    :aria-valuenow="Number(passwordStrength)"
                    aria-valuemin="0"
                    aria-valuemax="4"
                    :aria-label="passwordStrengthLabel"
                  >
                    <span
                      class="signup__password-strength-fill"
                      :style="{
                        inlineSize: `${passwordStrengthPercentage}%`,
                      }"
                    />
                  </div>

                  <span class="signup__password-strength-label">
                    {{ passwordStrengthLabel }}
                  </span>
                </div>
              </template>
            </Input>

            <template #actions>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                :icon="IconUserPlus"
                :loading="loading"
              >
                {{ t('pages.signup.form.actions.submit') }}
              </Button>
            </template>
          </Form>

          <p class="signup__footer">
            {{ t('pages.signup.form.footer.existingAccount') }}
            <NuxtLink to="/login">
              {{ t('pages.signup.form.footer.login') }}
            </NuxtLink>
          </p>
        </template>

        <template v-if="step === 2">
          <header id="signup-verification-title" class="signup__form-header">
            <h2 class="signup__form-title">
              {{ t('pages.signup.verification.title') }}
            </h2>

            <p class="signup__form-description">
              {{ t('pages.signup.verification.description') }}
            </p>
          </header>

          <div v-if="signup" class="signup__verification">
            <div class="signup__roblox-user">
              <div class="signup__roblox-avatar">
                <img
                  v-if="signup.user.avatar"
                  :src="signup.user.avatar"
                  :alt="signup.user.displayName"
                />

                <span v-else aria-hidden="true">
                  {{ signup.user.displayName.charAt(0).toUpperCase() }}
                </span>
              </div>

              <div class="signup__roblox-identity">
                <strong class="signup__roblox-display-name">
                  {{ signup.user.displayName }}
                </strong>

                <span class="signup__roblox-username"> @{{ signup.user.username }} </span>
              </div>
            </div>

            <div class="signup__verification-code">
              <span class="signup__verification-label">
                {{ t('pages.signup.verification.codeLabel') }}
              </span>

              <button
                type="button"
                class="signup__verification-code-button"
                :aria-label="
                  copied
                    ? t('pages.signup.verification.copied')
                    : t('pages.signup.verification.copy')
                "
                @click="copyCode"
              >
                <code>{{ signup.verification.code }}</code>

                <IconCheck v-if="copied" aria-hidden="true" />
                <IconCopy v-else aria-hidden="true" />
              </button>

              <p class="signup__verification-help">
                {{ t('pages.signup.verification.instructions') }}
              </p>
            </div>

            <div class="signup__verification-actions">
              <Button type="button" variant="ghost" size="lg" :icon="IconArrowLeft" @click="goBack">
                {{ t('common.actions.back') }}
              </Button>

              <Button
                type="button"
                variant="primary"
                size="lg"
                :icon="IconArrowRight"
                :loading="loading"
                :disabled="loading"
                @click="continueSignup"
              >
                {{ t('common.actions.continue') }}
              </Button>
            </div>

            <p v-if="error" class="signup__verification-error" role="alert">
              {{ error }}
            </p>
          </div>
        </template>
      </div>
    </section>
  </div>
</template>

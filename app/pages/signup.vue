<script setup lang="ts">
import { IconEye, IconEyeClosed } from '@tabler/icons-vue';
import { ref } from 'vue';

import Button from '~/components/ui/Button.vue';
import Form from '~/components/ui/Form.vue';
import Input from '~/components/ui/Input.vue';
import { useInstance } from '~/composables/useInstance';

const { t } = useI18n();
const { settings } = useInstance();

useHead({
  title: t('common.actions.signup'),
});

const username = ref('');
const password = ref('');
const showPassword = ref(false);
</script>

<template>
  <main class="signup">
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

    <section class="signup__form" aria-labelledby="signup-form-title">
      <span class="signup__divider" aria-hidden="true" />

      <div class="signup__form-inner">
        <header class="signup__form-header">
          <h2 id="signup-form-title" class="signup__form-title">
            {{ t('pages.signup.form.title') }}
          </h2>

          <p class="signup__form-description">
            {{ t('pages.signup.form.description') }}
          </p>
        </header>

        <Form>
          <Input
            v-model="username"
            :label="t('pages.signup.form.fields.username.label')"
            name="username"
            autocomplete="username"
            :placeholder="t('pages.signup.form.fields.username.placeholder')"
            required
          />

          <Input
            v-model="password"
            :label="t('pages.signup.form.fields.password.label')"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            :placeholder="t('pages.signup.form.fields.password.placeholder')"
            required
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
                @click="showPassword = !showPassword"
              />
            </template>
          </Input>

          <template #actions>
            <Button type="submit" variant="primary" size="lg">
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
      </div>
    </section>
  </main>
</template>

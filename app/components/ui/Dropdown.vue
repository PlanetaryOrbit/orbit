<script setup lang="ts">
import { IconCheck, IconChevronDown } from '@tabler/icons-vue';
import type { Component } from 'vue';

type DropdownItem = {
  label: string;
  value?: string;
  href?: string;
  icon?: Component;
  description?: string;
  shortcut?: string;
  disabled?: boolean;
  flag?: string;
  danger?: boolean;
  selected?: boolean;
  onSelect?: () => void | Promise<void>;
};

type DropdownSeparator = {
  type: 'separator';
};

type DropdownGroup = {
  type: 'group';
  label?: string;
  items: DropdownItem[];
};

type DropdownEntry = DropdownItem | DropdownSeparator | DropdownGroup;

interface DropdownProps {
  items?: DropdownEntry[];
  disabled?: boolean;
  align?: 'start' | 'end';
  placement?: 'bottom' | 'top';
  closeOnSelect?: boolean;
  triggerLabel?: string;
  class?: string;
}

const props = withDefaults(defineProps<DropdownProps>(), {
  items: () => [],
  disabled: false,
  align: 'end',
  placement: 'bottom',
  closeOnSelect: true,
  triggerLabel: 'Open menu',
});

const emit = defineEmits<{
  select: [item: DropdownItem];
  open: [];
  close: [];
}>();

const isOpen = ref(false);
const highlightedIndex = ref(-1);

const root = ref<HTMLElement | null>(null);
const trigger = ref<HTMLButtonElement | null>(null);
const menu = ref<HTMLElement | null>(null);

const menuId = useId();

const flattenedItems = computed<DropdownItem[]>(() => {
  const result: DropdownItem[] = [];

  for (const entry of props.items) {
    if ('type' in entry) {
      if (entry.type === 'group') {
        result.push(...entry.items);
      }

      continue;
    }

    result.push(entry);
  }

  return result;
});

const enabledItems = computed(() => flattenedItems.value.filter((item) => !item.disabled));

const selectedItem = computed(() => flattenedItems.value.find((item) => item.selected));

const highlightedItem = computed(() => {
  if (highlightedIndex.value < 0) {
    return undefined;
  }

  return enabledItems.value[highlightedIndex.value];
});

const highlightedId = computed(() => {
  if (!highlightedItem.value) {
    return undefined;
  }

  return getItemId(highlightedItem.value);
});

function getItemId(item: DropdownItem) {
  const index = flattenedItems.value.indexOf(item);

  return `${menuId}-item-${index}`;
}

function open() {
  if (props.disabled || isOpen.value) {
    return;
  }

  isOpen.value = true;

  const selectedIndex = enabledItems.value.findIndex((item) => item.selected);

  highlightedIndex.value = selectedIndex >= 0 ? selectedIndex : 0;

  emit('open');

  nextTick(() => {
    menu.value?.focus();
  });
}

function close(focusTrigger = true) {
  if (!isOpen.value) {
    return;
  }

  isOpen.value = false;
  highlightedIndex.value = -1;

  emit('close');

  if (focusTrigger) {
    nextTick(() => {
      trigger.value?.focus();
    });
  }
}

function toggle() {
  if (isOpen.value) {
    close();
  } else {
    open();
  }
}

function moveHighlight(direction: 1 | -1) {
  const length = enabledItems.value.length;

  if (!length) {
    return;
  }

  if (highlightedIndex.value < 0) {
    highlightedIndex.value = direction === 1 ? 0 : length - 1;
    return;
  }

  highlightedIndex.value = (highlightedIndex.value + direction + length) % length;
}

function setHighlight(index: number) {
  if (index < 0 || index >= enabledItems.value.length) {
    return;
  }

  highlightedIndex.value = index;
}

function getItemIndex(item: DropdownItem) {
  return enabledItems.value.indexOf(item);
}

function isHighlighted(item: DropdownItem) {
  return getItemIndex(item) === highlightedIndex.value;
}

async function selectItem(item: DropdownItem) {
  if (item.disabled) {
    return;
  }

  if (props.closeOnSelect) {
    close(false);
  }

  emit('select', item);

  await item.onSelect?.();
}

function selectHighlighted() {
  const item = highlightedItem.value;

  if (item) {
    void selectItem(item);
  }
}

function handleTriggerKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      open();
      break;

    case 'ArrowUp':
      event.preventDefault();
      open();

      nextTick(() => {
        highlightedIndex.value = enabledItems.value.length - 1;
      });
      break;

    case 'Enter':
    case ' ':
      event.preventDefault();
      toggle();
      break;

    case 'Escape':
      if (isOpen.value) {
        event.preventDefault();
        close();
      }
      break;
  }
}

function handleMenuKeydown(event: KeyboardEvent) {
  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault();
      moveHighlight(1);
      break;

    case 'ArrowUp':
      event.preventDefault();
      moveHighlight(-1);
      break;

    case 'Home':
      event.preventDefault();

      if (enabledItems.value.length) {
        highlightedIndex.value = 0;
      }
      break;

    case 'End':
      event.preventDefault();

      if (enabledItems.value.length) {
        highlightedIndex.value = enabledItems.value.length - 1;
      }
      break;

    case 'Enter':
    case ' ':
      event.preventDefault();
      selectHighlighted();
      break;

    case 'Escape':
      event.preventDefault();
      close();
      break;

    case 'Tab':
      close(false);
      break;
  }
}

function handleDocumentPointerdown(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) {
    close(false);
  }
}

watch(highlightedIndex, async () => {
  await nextTick();

  const item = menu.value?.querySelector<HTMLElement>('[data-highlighted="true"]');

  item?.scrollIntoView({
    block: 'nearest',
  });
});

onMounted(() => {
  document.addEventListener('pointerdown', handleDocumentPointerdown);
});

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleDocumentPointerdown);
});
</script>

<template>
  <div
    ref="root"
    :class="[
      'orbit-dropdown',
      {
        'orbit-dropdown--open': isOpen,
      },
      props.class,
    ]"
  >
    <button
      ref="trigger"
      type="button"
      class="orbit-button orbit-button--secondary orbit-button--md orbit-dropdown__trigger"
      :disabled="disabled"
      :aria-label="triggerLabel"
      :aria-expanded="isOpen"
      :aria-controls="isOpen ? menuId : undefined"
      aria-haspopup="menu"
      @click="toggle"
      @keydown="handleTriggerKeydown"
    >
      <span class="orbit-dropdown__trigger-content">
        <slot name="trigger">
          {{ selectedItem?.label ?? triggerLabel }}
        </slot>
      </span>

      <span class="orbit-button__icon" aria-hidden="true">
        <IconChevronDown class="orbit-button__icon-svg" />
      </span>
    </button>

    <div
      v-if="isOpen"
      :id="menuId"
      ref="menu"
      :class="[
        'orbit-dropdown__menu',
        `orbit-dropdown__menu--${align}`,
        {
          'orbit-dropdown__menu--top': placement === 'top',
        },
      ]"
      role="menu"
      tabindex="-1"
      data-state="open"
      :aria-activedescendant="highlightedId"
      @keydown="handleMenuKeydown"
    >
      <template v-for="(entry, entryIndex) in items" :key="entryIndex">
        <div
          v-if="'type' in entry && entry.type === 'separator'"
          class="orbit-dropdown__separator"
          role="separator"
        />

        <div
          v-else-if="'type' in entry && entry.type === 'group'"
          class="orbit-dropdown__group"
          role="group"
          :aria-label="entry.label"
        >
          <span v-if="entry.label" class="orbit-dropdown__label">
            {{ entry.label }}
          </span>

          <template v-for="item in entry.items" :key="item.value ?? item.label">
            <NuxtLinkLocale
              v-if="item.href && !item.disabled"
              :id="getItemId(item)"
              :to="item.href"
              class="orbit-dropdown__item"
              :class="{
                'orbit-dropdown__item--danger': item.danger,
                'orbit-dropdown__item--selected': item.selected,
              }"
              :data-highlighted="isHighlighted(item)"
              role="menuitem"
              @mouseenter="setHighlight(getItemIndex(item))"
              @click="selectItem(item)"
            >
              <span v-if="item.flag" class="orbit-dropdown__item-flag" aria-hidden="true">
                <span :class="['fi', `fi-${item.flag}`]" />
              </span>

              <span v-else-if="item.icon" class="orbit-dropdown__item-icon" aria-hidden="true">
                <component :is="item.icon" class="orbit-dropdown__item-icon-svg" />
              </span>

              <span class="orbit-dropdown__item-content">
                <span class="orbit-dropdown__item-label">
                  {{ item.label }}
                </span>

                <span v-if="item.description" class="orbit-dropdown__item-description">
                  {{ item.description }}
                </span>
              </span>

              <span v-if="item.shortcut" class="orbit-dropdown__item-shortcut" aria-hidden="true">
                {{ item.shortcut }}
              </span>

              <span v-if="item.selected" class="orbit-dropdown__item-check" aria-hidden="true">
                <IconCheck class="orbit-dropdown__item-icon-svg" />
              </span>
            </NuxtLinkLocale>

            <button
              v-else
              :id="getItemId(item)"
              type="button"
              class="orbit-dropdown__item"
              :class="{
                'orbit-dropdown__item--danger': item.danger,
                'orbit-dropdown__item--selected': item.selected,
              }"
              :disabled="item.disabled"
              :data-highlighted="isHighlighted(item)"
              role="menuitem"
              :aria-disabled="item.disabled || undefined"
              @mouseenter="setHighlight(getItemIndex(item))"
              @click="selectItem(item)"
            >
              <span v-if="item.flag" class="orbit-dropdown__item-flag" aria-hidden="true">
                <span :class="['fi', `fi-${item.flag}`]" />
              </span>

              <span v-else-if="item.icon" class="orbit-dropdown__item-icon" aria-hidden="true">
                <component :is="item.icon" class="orbit-dropdown__item-icon-svg" />
              </span>

              <span class="orbit-dropdown__item-content">
                <span class="orbit-dropdown__item-label">
                  {{ item.label }}
                </span>

                <span v-if="item.description" class="orbit-dropdown__item-description">
                  {{ item.description }}
                </span>
              </span>

              <span v-if="item.shortcut" class="orbit-dropdown__item-shortcut" aria-hidden="true">
                {{ item.shortcut }}
              </span>

              <span v-if="item.selected" class="orbit-dropdown__item-check" aria-hidden="true">
                <IconCheck class="orbit-dropdown__item-icon-svg" />
              </span>
            </button>
          </template>
        </div>

        <template v-else>
          <NuxtLinkLocale
            v-if="entry.href && !entry.disabled"
            :id="getItemId(entry)"
            :to="entry.href"
            class="orbit-dropdown__item"
            :class="{
              'orbit-dropdown__item--danger': entry.danger,
              'orbit-dropdown__item--selected': entry.selected,
            }"
            :data-highlighted="isHighlighted(entry)"
            role="menuitem"
            @mouseenter="setHighlight(getItemIndex(entry))"
            @click="selectItem(entry)"
          >
            <span v-if="entry.flag" class="orbit-dropdown__item-flag" aria-hidden="true">
              <span :class="['fi', `fi-${entry.flag}`]" />
            </span>

            <span v-else-if="entry.icon" class="orbit-dropdown__item-icon" aria-hidden="true">
              <component :is="entry.icon" class="orbit-dropdown__item-icon-svg" />
            </span>

            <span class="orbit-dropdown__item-content">
              <span class="orbit-dropdown__item-label">
                {{ entry.label }}
              </span>

              <span v-if="entry.description" class="orbit-dropdown__item-description">
                {{ entry.description }}
              </span>
            </span>

            <span v-if="entry.shortcut" class="orbit-dropdown__item-shortcut" aria-hidden="true">
              {{ entry.shortcut }}
            </span>

            <span v-if="entry.selected" class="orbit-dropdown__item-check" aria-hidden="true">
              <IconCheck class="orbit-dropdown__item-icon-svg" />
            </span>
          </NuxtLinkLocale>

          <button
            v-else
            :id="getItemId(entry)"
            type="button"
            class="orbit-dropdown__item"
            :class="{
              'orbit-dropdown__item--danger': entry.danger,
              'orbit-dropdown__item--selected': entry.selected,
            }"
            :disabled="entry.disabled"
            :data-highlighted="isHighlighted(entry)"
            role="menuitem"
            :aria-disabled="entry.disabled || undefined"
            @mouseenter="setHighlight(getItemIndex(entry))"
            @click="selectItem(entry)"
          >
            <span v-if="entry.flag" class="orbit-dropdown__item-flag" aria-hidden="true">
              <span :class="['fi', `fi-${entry.flag}`]" />
            </span>

            <span v-else-if="entry.icon" class="orbit-dropdown__item-icon" aria-hidden="true">
              <component :is="entry.icon" class="orbit-dropdown__item-icon-svg" />
            </span>

            <span class="orbit-dropdown__item-content">
              <span class="orbit-dropdown__item-label">
                {{ entry.label }}
              </span>

              <span v-if="entry.description" class="orbit-dropdown__item-description">
                {{ entry.description }}
              </span>
            </span>

            <span v-if="entry.shortcut" class="orbit-dropdown__item-shortcut" aria-hidden="true">
              {{ entry.shortcut }}
            </span>

            <span v-if="entry.selected" class="orbit-dropdown__item-check" aria-hidden="true">
              <IconCheck class="orbit-dropdown__item-icon-svg" />
            </span>
          </button>
        </template>
      </template>

      <div v-if="!items.length" class="orbit-dropdown__empty">
        <slot name="empty">No options available.</slot>
      </div>
    </div>
  </div>
</template>

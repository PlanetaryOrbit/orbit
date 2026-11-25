export type ChangelogRelease = {
  version: string;
  date: string;
  changes: string[];
};

type ChangeCategory = {
  label: string;
  badge: string;
};

const CHANGE_CATEGORIES: Record<string, ChangeCategory> = {
  added: {
    label: 'Added',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  },
  fixed: {
    label: 'Fixed',
    badge: 'bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300',
  },
  updated: {
    label: 'Updated',
    badge: 'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  },
  removed: {
    label: 'Removed',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300',
  },
  remade: {
    label: 'Remade',
    badge: 'bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300',
  },
  changed: {
    label: 'Changed',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
  },
  switched: {
    label: 'Switched',
    badge: 'bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  },
  reverted: {
    label: 'Reverted',
    badge: 'bg-zinc-100 text-zinc-600 dark:bg-zinc-500/15 dark:text-zinc-300',
  },
  improved: {
    label: 'Improved',
    badge: 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300',
  },
};

const CATEGORY_PREFIX = /^\*{1,2}([A-Za-z]+)\*{1,2}:?\s+/;

export function parseChange(change: string) {
  const text = change.trim();
  const match = text.match(CATEGORY_PREFIX);
  const category = match && CHANGE_CATEGORIES[match[1].toLowerCase()];

  if (!match || !category) return { category: null, text };

  return { category, text: text.slice(match[0].length).trim() };
}

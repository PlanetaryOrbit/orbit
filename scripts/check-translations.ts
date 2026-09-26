import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

const localesDir = join(import.meta.dir, '..', 'i18n', 'locales');

type TranslationMeta = {
  locale: string;
  maintainers: Array<{
    github: string;
    discordId: string;
  }>;
  lastUpdated?: string;
};

type TranslationFile = {
  $meta?: TranslationMeta;
  [key: string]: unknown;
};

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;

    return flattenKeys(child, path);
  });
}

function translationKeys(value: TranslationFile): string[] {
  return flattenKeys(
    Object.fromEntries(Object.entries(value).filter(([key]) => key !== '$meta')),
  ).sort();
}

function findEmptyStrings(value: unknown, prefix = ''): string[] {
  if (typeof value === 'string') {
    return value.trim() === '' && prefix ? [prefix] : [];
  }

  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return findEmptyStrings(child, path);
  });
}

function isValidMeta(meta: unknown): meta is TranslationMeta {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) {
    return false;
  }

  const value = meta as Record<string, unknown>;

  if (typeof value.locale !== 'string' || !value.locale) {
    return false;
  }

  if (!Array.isArray(value.maintainers) || value.maintainers.length === 0) {
    return false;
  }

  return value.maintainers.every((maintainer) => {
    if (!maintainer || typeof maintainer !== 'object') {
      return false;
    }

    const person = maintainer as Record<string, unknown>;

    return (
      typeof person.github === 'string' &&
      person.github.length > 0 &&
      typeof person.discordId === 'string' &&
      person.discordId.length > 0
    );
  });
}

async function readLocale(file: string): Promise<TranslationFile | null> {
  const path = join(localesDir, file);

  try {
    const contents = await Bun.file(path).text();
    const parsed = JSON.parse(contents);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      console.error(`✗ ${file}: root must be a JSON object`);
      return null;
    }

    return parsed as TranslationFile;
  } catch (error) {
    console.error(`✗ ${file}: invalid JSON`);

    if (error instanceof Error) {
      console.error(`  ${error.message}`);
    }

    return null;
  }
}

const files = (await readdir(localesDir)).filter((file) => file.endsWith('.json')).sort();

if (!files.includes('en.json')) {
  console.error('✗ en.json is missing');
  process.exit(1);
}

const source = await readLocale('en.json');

if (!source) {
  process.exit(1);
}

const sourceKeys = translationKeys(source);
let failed = false;

if (!source.$meta) {
  console.error('✗ en.json: missing $meta');
  failed = true;
} else if (!isValidMeta(source.$meta)) {
  console.error('✗ en.json: invalid $meta');
  failed = true;
}

for (const file of files) {
  const locale = await readLocale(file);

  if (!locale) {
    failed = true;
    continue;
  }

  if (!locale.$meta) {
    console.error(`✗ ${file}: missing $meta`);
    failed = true;
  } else if (!isValidMeta(locale.$meta)) {
    console.error(`✗ ${file}: invalid $meta`);
    failed = true;
  }

  const keys = translationKeys(locale);

  const missing = sourceKeys.filter((key) => !keys.includes(key));
  const extra = keys.filter((key) => !sourceKeys.includes(key));

  if (missing.length > 0) {
    console.error(`✗ ${file}: missing ${missing.length} key(s)`);

    for (const key of missing) {
      console.error(`  - ${key}`);
    }

    failed = true;
  }

  if (extra.length > 0) {
    console.error(`✗ ${file}: has ${extra.length} extra key(s)`);

    for (const key of extra) {
      console.error(`  + ${key}`);
    }

    failed = true;
  }

  const empty = findEmptyStrings(
    Object.fromEntries(Object.entries(locale).filter(([key]) => key !== '$meta')),
  );

  if (empty.length > 0) {
    console.error(`✗ ${file}: has empty translation(s)`);

    for (const key of empty) {
      console.error(`  - ${key}`);
    }

    failed = true;
  }

  if (!failed) {
    console.log(`✓ ${file}`);
  }
}

if (failed) {
  console.error('\nTranslation check failed.');
  process.exit(1);
}

console.log(`\n✓ All ${files.length} locale files are valid.`);

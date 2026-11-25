const AVATAR_BACKGROUNDS = [
  '#fce7f3',
  '#fbcfe8',
  '#f9a8d4',
  '#f472b6',
  '#ec4899',
  '#e0e7ff',
  '#c7d2fe',
  '#a5b4fc',
  '#818cf8',
  '#6366f1',
  '#d1fae5',
  '#a7f3d0',
  '#6ee7b7',
  '#34d399',
  '#10b981',
  '#cffafe',
  '#a5f3fc',
  '#67e8f9',
  '#22d3ee',
  '#06b6d4',
  '#fef3c7',
  '#fde68a',
  '#fcd34d',
  '#fbbf24',
  '#f59e0b',
];

export function getAvatarBgColor(displayName: string): string {
  let hash = 0;

  for (let index = 0; index < displayName.length; index++) {
    hash = (hash * 31 + displayName.charCodeAt(index)) >>> 0;
  }

  return AVATAR_BACKGROUNDS[hash % AVATAR_BACKGROUNDS.length];
}

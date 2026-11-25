export const LINKABLE_PROVIDERS = [
  { id: 'discord', label: 'Discord', icon: '/discord.svg', accountKey: 'discordUser' },
  { id: 'google', label: 'Google', icon: '/google.svg', accountKey: 'googleUser' },
] as const;

export type LinkableProvider = (typeof LINKABLE_PROVIDERS)[number];

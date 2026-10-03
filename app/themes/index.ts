export interface ThemeDefinition {
  id: string;
  name: string;
  className: string;
  colorScheme: 'light' | 'dark';
}

export const themes: ThemeDefinition[] = [
  {
    id: 'light',
    name: 'Light',
    className: 'light',
    colorScheme: 'light',
  },
  {
    id: 'dark',
    name: 'Dark',
    className: 'dark',
    colorScheme: 'dark',
  },
  {
    id: 'midnight',
    name: 'Midnight',
    className: 'midnight',
    colorScheme: 'dark',
  },
];

export const defaultTheme: ThemeDefinition = {
  id: 'dark',
  name: 'Dark',
  className: 'dark',
  colorScheme: 'dark',
};

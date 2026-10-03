import { defaultTheme, themes, type ThemeDefinition } from '~/themes';

export type Theme = ThemeDefinition['id'];

export function useTheme() {
  const theme = useState<Theme>('theme', () => defaultTheme.id);

  const currentTheme = computed(
    () => themes.find((item) => item.id === theme.value) ?? defaultTheme,
  );

  function applyTheme(themeId: Theme) {
    const root = document.documentElement;

    for (const item of themes) {
      root.classList.remove(item.className);
    }

    const selectedTheme = themes.find((item) => item.id === themeId) ?? defaultTheme;

    root.classList.add(selectedTheme.className);
  }

  function setTheme(themeId: Theme) {
    const selectedTheme = themes.find((item) => item.id === themeId);

    if (!selectedTheme) {
      return;
    }

    theme.value = selectedTheme.id;
    localStorage.setItem('theme', selectedTheme.id);
    applyTheme(selectedTheme.id);
  }

  if (import.meta.client) {
    const storedTheme = localStorage.getItem('theme');

    if (storedTheme && themes.some((item) => item.id === storedTheme)) {
      theme.value = storedTheme;
    }

    applyTheme(theme.value);
  }

  return {
    theme,
    themes,
    currentTheme,
    setTheme,
  };
}

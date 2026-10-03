export type Theme = 'dark' | 'light';

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'dark');
  const isDark = computed(() => theme.value === 'dark');

  function applyTheme(newTheme: Theme) {
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }

  async function setTheme(newTheme: Theme) {
    theme.value = newTheme;
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
  }

  function toggle() {
    return setTheme(isDark.value ? 'light' : 'dark');
  }

  if (import.meta.client) {
    const storedTheme = localStorage.getItem('theme');

    if (storedTheme === 'dark' || storedTheme === 'light') {
      theme.value = storedTheme;
    }

    applyTheme(theme.value);
  }

  return {
    theme,
    isDark,
    setTheme,
    toggle,
  };
}

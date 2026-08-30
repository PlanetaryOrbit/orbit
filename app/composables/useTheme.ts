export type Theme = 'dark' | 'light';

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'dark');

  const isDark = computed(() => theme.value === 'dark');

  async function setTheme(newTheme: Theme) {
    theme.value = newTheme;

    localStorage.setItem('theme', newTheme);

    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  }

  function toggle() {
    return setTheme(isDark.value ? 'light' : 'dark');
  }

  return {
    theme,
    isDark,
    setTheme,
    toggle,
  };
}

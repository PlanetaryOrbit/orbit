const pluralRules = {
  'cs-CZ': (choice: number, choicesLength: number) => {
    if (choicesLength === 1) {
      return 0;
    }
    const category = new Intl.PluralRules('cs-CZ').select(choice);
    switch (category) {
      case 'one':
        return 0;
      case 'few':
        return 1;
      default:
        return Math.min(2, choicesLength - 1);
    }
  },
};

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en-US',
  fallbackLocale: 'en-US',
  pluralRules,
}));

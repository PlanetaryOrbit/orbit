# Orbit v3

This README is more of a TODO list and memory board.

# Translation

Orbit uses JSON locale files for translations. English (`en.json`) is the base translation and should contain every available translation key. Other locales should keep the same key structure as English. English is the fallback locale.

Locale files are located in `i18n/locales/`.

### Maintainers

- @michaelscriptss: ur-PK translations (1339391424067534869)
- @breadybread123: de-DE translations (1282023005605593175)
- @tucnak1111: cs-CZ translations (1061593251498430494)
- @nemusyy: fr-FR translations (800033088393707580)
- @carteraccs: es-EN translations (1149841240897114154)

For the README, I’d make the theme section a practical contributor guide that explains the registry, the theme class, and the SCSS variables without documenting internal implementation details too heavily.

````md
# Themes

Orbit supports multiple themes. The default theme is `dark`. Users can switch between available themes from the footer.

Themes are defined through a central theme registry, so adding a theme does not require modifying the theme selector or other parts of the application.

## Creating Themes

To create a theme, add a new entry to `themes/index.ts`:

```ts
{
  id: 'midnight',
  name: 'Midnight',
  className: 'midnight',
  colorScheme: 'dark',
},
```
````

The fields are:

- `id` is the unique identifier used by Orbit to store and select the theme.
- `name` is the name displayed to users.
- `className` is the class added to the `<html>` element when the theme is active.
- `colorScheme` describes whether the theme is light or dark.

For example, the `midnight` theme is applied as:

```html
<html class="midnight"></html>
```

### Adding Theme Styles

Theme styles are defined in the theme SCSS files.

Create a new file in `~/styles/themes/` and target the theme's HTML class:

```scss
html.midnight {
  color-scheme: dark;

  --slate-50: oklch(...);
  --slate-100: oklch(...);
  --slate-200: oklch(...);

  // ...
}
```

Orbit themes should provide the same color variables as the other themes. This allows components to use the shared variables without needing to know which theme is currently active.

For example:

```scss
.orbit-button {
  background: var(--slate-800);
  color: var(--slate-50);
  border-color: var(--slate-700);
}
```

Do not add theme-specific selectors to individual components unless there is a genuine reason for the component to behave differently between themes. Prefer updating the theme's variables instead.

The theme registry is the source of truth for available themes. The theme selector should not need to be manually updated when a new theme is added.

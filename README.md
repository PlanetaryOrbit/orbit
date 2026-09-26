````md
# Orbit v3

This README is more of a TODO list and memory board.

## Translation

Orbit uses JSON locale files for translations. English (`en.json`) is the base translation and should contain every available translation key. Other locales should keep the same key structure as English.

Locale files are located in `i18n/locales/`.

### Maintainers

- @michaelscriptss: ur-PK translations (1339391424067534869)
- @breadybread123: de-DE translations (1282023005605593175)
- @tucnak1111: cs-CZ translations (1061593251498430494)
- @nemusyy: fr-FR translations (800033088393707580)

### How translations work

Translation keys are organized by feature or purpose:

```json
{
  "common": {
    "actions": {
      "back": "Go back",
      "cancel": "Cancel"
    }
  },
  "auth": {
    "login": "Login"
  }
}
```
````

In Vue components, use `useI18n()` and the `t()` function:

```ts
const { t } = useI18n();
```

```vue
<Button>
  {{ t('auth.login') }}
</Button>
```

Do not hardcode user-facing text when a translation key should be used.

### Locale metadata

Each locale contains a `$meta` object describing who maintains it:

```json
{
  "$meta": {
    "locale": "de-DE",
    "maintainers": [
      {
        "github": "breadybread123",
        "discordId": "1282023005605593175"
      }
    ],
    "lastUpdated": "2026-09-26"
  }
}
```

`$meta` is not a translation key and should not be displayed to users.

### Pull requests

Translation changes should be submitted through a pull request.

Keep translation-only PRs focused on translations. If a translation needs a UI or code change to work correctly, mention that in the PR rather than silently changing unrelated code.

Translation maintainers are responsible for reviewing changes to their respective locales.

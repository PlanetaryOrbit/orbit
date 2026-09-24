# Translations
*Last Updated / Effective Date:* September 24th, 2026

> [!NOTE]
> Translating is not implemented into Orbit fully yet, and translations are not yet available.

Orbit will support community-maintained translations. Translations will be stored directly in the Orbit repository and reviewed through GitHub pull requests.

There will be no external translation service required to contribute a translation.

## How Translations Work

Orbit will use English as the source language.

The planned structure is:

```text
locales/
├── en.json
├── de.json
├── es.json
├── fr.json
├── ja.json
└── pt-BR.json
```

`en.json` will be the source of truth. Other language files should contain the same translation keys as the English file.

**Translations should not change the structure or names of translation keys.**

For example:

```json
{
  "header": {
    "settings": "Settings"
  },
  "main": {
    "pick_workspace": "Pick a workspace"
  }
}
```

A French translation would keep the keys unchanged:

```json
{
  "header": {
    "settings": "Paramètres"
  },
  "main": {
    "pick_workspace": "Choisir un espace de travail"
  }
}
```

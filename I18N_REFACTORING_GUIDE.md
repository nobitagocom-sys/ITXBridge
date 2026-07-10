# i18n Refactoring Guide

## Current Status

The i18n system is now set up to support 3 languages: **English (en), Japanese (ja), Vietnamese (vi)**.

Translation files are located in:
- `/public/i18n/literals/en.json` - English (default, used as keys)
- `/public/i18n/literals/ja.json` - Japanese translations
- `/public/i18n/literals/vi.json` - Vietnamese translations

## How to Use Translations in Components

### For Static Text (HTML)

Wrap text with the `<T>` component to enable automatic translation:

```jsx
import { T } from "@/i18n/T";

export default function MyComponent() {
  return (
    <div>
      <p><T>Loading</T></p>
      <button><T>Save</T></button>
      <span><T>Running</T></span>
    </div>
  );
}
```

### For Dynamic State Text

Use the `useTranslation` hook to translate text that changes based on component state:

```jsx
import { useTranslation } from "@/i18n/useTranslation";

export default function MyComponent() {
  const [status, setStatus] = useState("pending");
  const t = useTranslation();

  return (
    <div>
      {status === "loading" && <p>{t("Loading")}</p>}
      {status === "success" && <p>{t("Success")}</p>}
      {status === "error" && <p>{t("Error")}</p>}
    </div>
  );
}
```

### For Ternary/Conditional Text

```jsx
import { T } from "@/i18n/T";

export default function MyComponent({ isRunning }) {
  return (
    <div>
      {isRunning ? (
        <Badge><T>Running</T></Badge>
      ) : (
        <Badge><T>Stopped</T></Badge>
      )}
    </div>
  );
}
```

## Adding New Translations

1. Use English text as the key in components
2. The translation system will look up the key in `/public/i18n/literals/{locale}.json`
3. If translation not found, it falls back to English (the key itself)

Example: If you add `<T>My New Feature</T>`, add the following to translation files:

**en.json:**
```json
{
  "My New Feature": "My New Feature"
}
```

**ja.json:**
```json
{
  "My New Feature": "私の新機能"
}
```

**vi.json:**
```json
{
  "My New Feature": "Tính năng mới của tôi"
}
```

## Common UI Text to Translate

These are priority strings that should be wrapped with `<T>`:

- Status: "Loading", "Success", "Failed", "Error", "Running", "Stopped", "Active", "Inactive"
- Actions: "Save", "Cancel", "Delete", "Edit", "Enable", "Disable", "Add", "Remove", "Apply"
- Messages: All user-facing messages, tooltips, labels

## How It Works

### Initialization
1. `RuntimeI18nProvider` initializes i18n on page load
2. Reads locale from cookie (`locale` cookie)
3. Loads appropriate translation file from `/public/i18n/literals/{locale}.json`
4. Processes DOM to translate static text nodes

### On Language Switch
1. User selects new language in language switcher
2. API call posts to `/api/locale` to update cookie
3. `onLocaleChange` callbacks fire
4. DOM is re-processed with new translations
5. Components with `<T>` or `useTranslation` re-render with new translations

### Translation Mechanism

Text goes through `translate(text)` which:
1. Trims the text
2. If locale is "en", returns text as-is
3. Otherwise, looks up in `translationMap` (loaded from JSON)
4. Falls back to original text if not found

## Important Notes

### Do NOT Wrap
- Form input placeholders (unless critical)
- Code, URLs, technical terms that should stay in English
- Variables or dynamic error messages (use `t()` hook instead)
- Elements marked with `data-i18n-skip="true"` (intentionally skipped)

### Translation Format
Keys in JSON must **exactly match** the English text:
```json
{
  "Loading real data from ITXBridge...": "ITXBridge から実データを読み込み中..."
}
```

Spaces, punctuation, and case must match exactly!

## Files to Update

High priority UI components with hardcoded text:

1. **Token Saver Pages**
   - `src/app/(dashboard)/dashboard/token-saver/TokenSaverClient.js`
   - `src/app/(dashboard)/dashboard/token-saver/simulation/RealtimeStatus.js`

2. **CLI Tools**
   - `src/app/(dashboard)/dashboard/cli-tools/components/MitmServerCard.js`
   - `src/app/(dashboard)/dashboard/cli-tools/components/AntigravityToolCard.js`
   - `src/app/(dashboard)/dashboard/cli-tools/components/CoworkToolCard.js`

3. **Providers**
   - `src/app/(dashboard)/dashboard/providers/components/ConnectionsCard.js`
   - `src/app/(dashboard)/dashboard/providers/components/ModelsCard.js`

4. **Endpoint**
   - `src/app/(dashboard)/dashboard/endpoint/EndpointPageClient.js`

5. **Usage/Inspector**
   - `src/app/(dashboard)/dashboard/usage/components/TokenSaverTab.js`
   - `src/app/(dashboard)/dashboard/usage/components/UsageChart.js`
   - `src/app/(dashboard)/dashboard/inspector/components/RequestInspector.js`

## Testing

To test translations:
1. Open the app
2. Use the language switcher (flag icon)
3. Verify that UI text changes to selected language
4. Check both static text and component state-based text

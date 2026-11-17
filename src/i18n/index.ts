import { fr, type UiKey } from './fr';

const dictionaries = { fr } as const;
export type Locale = keyof typeof dictionaries;

export function t(key: UiKey, locale: Locale = 'fr'): string {
  return dictionaries[locale][key];
}

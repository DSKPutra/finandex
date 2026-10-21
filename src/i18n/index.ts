// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// i18n (§10.8): every UI string lives in id.json / en.json; Dex names, tabs and taglines come from the registry Labels.
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';
import en from './en.json';
import id from './id.json';

export type Locale = 'id' | 'en';

export function deviceLocale(): Locale {
  const l = (typeof navigator !== 'undefined' ? navigator.language : 'id').toLowerCase();
  return l.startsWith('en') ? 'en' : 'id';
}

void i18n.use(initReactI18next).init({
  resources: { id: { translation: id }, en: { translation: en } },
  lng: 'id',
  fallbackLng: 'id',
  interpolation: { escapeValue: false },
  returnObjects: true,
});

export { i18n, useTranslation };

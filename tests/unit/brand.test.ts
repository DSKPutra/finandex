// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { describe, expect, it } from 'vitest';
import {
  APP_TAGLINE_EN, APP_TAGLINE_ID, COPYRIGHT_EN, COPYRIGHT_ID, CREDIT_EN, CREDIT_ID, PERSONAL_TAGLINE,
  appTaglineFor, copyrightFor, creditFor,
} from '../../src/config/brand';

describe('brand strings (§11)', () => {
  it('are exact', () => {
    expect(COPYRIGHT_EN).toBe('© 2026 Dea Saka Kurnia Putra. All rights reserved.');
    expect(COPYRIGHT_ID).toBe('© 2026 Dea Saka Kurnia Putra. Hak cipta dilindungi undang-undang.');
    expect(CREDIT_ID).toBe('Finandex dirancang dan dikembangkan oleh Dea Saka Kurnia Putra.');
    expect(CREDIT_EN).toBe('Finandex is designed and developed by Dea Saka Kurnia Putra.');
    expect(PERSONAL_TAGLINE).toBe('A BRIGHTER TOMORROW THROUGH MEANINGFUL WORK');
    expect(APP_TAGLINE_ID).toBe('Wawasan Indeks Pasar Keuangan Global');
    expect(APP_TAGLINE_EN).toBe('Global Financial Market Indexing Insights');
  });
  it('widens the year range after 2026', () => {
    expect(copyrightFor('en', 2026)).toBe(COPYRIGHT_EN);
    expect(copyrightFor('id', 2025)).toBe(COPYRIGHT_ID);
    expect(copyrightFor('en', 2028)).toBe('© 2026–2028 Dea Saka Kurnia Putra. All rights reserved.');
    expect(copyrightFor('id', 2027)).toBe('© 2026–2027 Dea Saka Kurnia Putra. Hak cipta dilindungi undang-undang.');
  });
  it('localises credit and tagline', () => {
    expect(creditFor('id')).toBe(CREDIT_ID);
    expect(creditFor('en')).toBe(CREDIT_EN);
    expect(appTaglineFor('id')).toBe(APP_TAGLINE_ID);
    expect(appTaglineFor('en')).toBe(APP_TAGLINE_EN);
  });
});

// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { CREDIT_EN, CREDIT_ID, PERSONAL_TAGLINE } from '../config/brand.ts';

export default function About({ locale, theme }: { locale: 'id' | 'en'; theme: 'dark' | 'light' }) {
  const wordmark = theme === 'dark' ? '/brand/dskp-wordmark-on-dark.png' : '/brand/dskp-wordmark-on-light.png';
  return (
    <section>
      <img src={wordmark} alt="Dea Saka Kurnia Putra" />
      <p>{locale === 'id' ? CREDIT_ID : CREDIT_EN}</p>
      <p>{PERSONAL_TAGLINE}</p>
    </section>
  );
}

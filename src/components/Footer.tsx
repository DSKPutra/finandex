// © 2026 Dea Saka Kurnia Putra. All rights reserved.
import { copyrightLine } from '../config/brand.ts';

export function Footer({ locale }: { locale: 'id' | 'en' }) {
  return <footer className="footer">{copyrightLine(locale)}</footer>;
}

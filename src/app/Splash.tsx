// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Splash screen (§11.1): Finandex icon centred; below it the personal "P" mark + "by Dea Saka Kurnia Putra".
import { CREATOR } from '../config/brand.ts';

export function Splash() {
  return (
    <div className="splash" role="status" aria-label="Finandex">
      <img src="/icons/finandex-192.png" width={96} height={96} alt="Finandex" />
      <div className="splash-by">
        <img src="/brand/dskp-mark-on-dark-64.png" width={24} height={24} alt="" />
        <span>by {CREATOR}</span>
      </div>
    </div>
  );
}

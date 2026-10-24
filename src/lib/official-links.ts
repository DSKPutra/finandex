// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Official-channel links (§12.6): institution links must point to the official domains listed in
// kit/datasets/antiscam/antiscam_kb.json and open in the in-app browser that shows the URL (Capacitor Browser on
// native; a new tab with noopener on the web). Phone/WhatsApp/email become tel:, wa.me and mailto: links.
const isNative = () => !!(globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

/** Hosts of official channels (and regulation sources) that Finandex may link to. */
export const OFFICIAL_HOSTS = [/(^|\.)ojk\.go\.id$/, /(^|\.)bi\.go\.id$/, /^cekrekening\.id$/, /^aduannomor\.id$/, /^lapssjk\.id$/, /(^|\.)peraturan\.go\.id$/, /(^|\.)bpk\.go\.id$/, /(^|\.)kemenkeu\.go\.id$/, /(^|\.)ppatk\.go\.id$/, /(^|\.)setneg\.go\.id$/, /(^|\.)komdigi\.go\.id$/, /(^|\.)polri\.go\.id$/, /(^|\.)mahkamahagung\.go\.id$/, /(^|\.)jdihn\.go\.id$/, /(^|\.)dpr\.go\.id$/];

export function isOfficialUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && OFFICIAL_HOSTS.some((re) => re.test(u.hostname));
  } catch {
    return false;
  }
}

export async function openOfficial(url: string): Promise<void> {
  if (!isOfficialUrl(url)) return;
  if (isNative()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({ url, presentationStyle: 'popover' });
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

export const telHref = (phone: string) => `tel:${phone.replace(/[^\d+]/g, '')}`;
/** Indonesian mobile numbers (08…) become +62… for wa.me. */
export const waHref = (n: string) => `https://wa.me/${n.replace(/\D/g, '').replace(/^0/, '62')}`;
export const mailHref = (e: string) => `mailto:${e}`;
export const hostOf = (url: string) => {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
};

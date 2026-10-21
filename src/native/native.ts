// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Native integration (§14) — only active inside Capacitor: status bar & splash per theme, Android back button
// (close sheet → go back → confirm exit at root), haptics on send, share sheet for charts, external links in the
// in-app browser, keyboard resize. Every plugin is imported lazily so the web bundle stays small.
import { Capacitor } from '@capacitor/core';

export const isNative = () => Capacitor.isNativePlatform();

export async function initNative(opts: { dark: boolean; exitPrompt: string }): Promise<void> {
  if (!isNative()) return;
  const [{ StatusBar, Style }, { SplashScreen }, { App }, { Keyboard }] = await Promise.all([
    import('@capacitor/status-bar'),
    import('@capacitor/splash-screen'),
    import('@capacitor/app'),
    import('@capacitor/keyboard'),
  ]);
  await StatusBar.setStyle({ style: opts.dark ? Style.Dark : Style.Light }).catch(() => undefined);
  if (Capacitor.getPlatform() === 'android')
    await StatusBar.setBackgroundColor({ color: opts.dark ? '#0A0F0C' : '#F6F8F7' }).catch(() => undefined);
  await Keyboard.setResizeMode?.({ mode: 'body' as never }).catch(() => undefined);
  await SplashScreen.hide().catch(() => undefined);
  await App.addListener('backButton', ({ canGoBack }) => {
    const open = document.querySelector('[role="dialog"][data-state="open"]');
    if (open) {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      return;
    }
    if (canGoBack && location.pathname !== '/') history.back();
    else if (window.confirm(opts.exitPrompt)) void App.exitApp();
  });
  document.addEventListener('click', (e) => {
    const a = (e.target as HTMLElement | null)?.closest?.('a[href^="http"]') as HTMLAnchorElement | null;
    if (a && new URL(a.href).origin !== location.origin) {
      e.preventDefault();
      void import('@capacitor/browser').then(({ Browser }) => Browser.open({ url: a.href }));
    }
  });
}

export async function hapticTap(): Promise<void> {
  if (!isNative()) return;
  const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
  await Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
}

/** Share a PNG data URL through the native share sheet (writes a cache file first). */
export async function sharePng(dataUrl: string, title: string): Promise<boolean> {
  if (!isNative()) return false;
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const file = await Filesystem.writeFile({
    path: `finandex-${Date.now()}.png`,
    data: dataUrl.split(',')[1]!,
    directory: Directory.Cache,
  });
  await Share.share({ title, text: 'Finandex · © Dea Saka Kurnia Putra', files: [file.uri] });
  return true;
}

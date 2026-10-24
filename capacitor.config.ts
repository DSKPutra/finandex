// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Capacitor (§14). appId = BUNDLE_ID (§19) — default `com.deasakakurniaputra.finandex` [KONFIRMASI]:
// permanent once published to the stores; override with the BUNDLE_ID env before `cap add`/`cap sync`.
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: process.env.BUNDLE_ID ?? 'com.deasakakurniaputra.finandex',
  appName: 'Finandex',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  backgroundColor: '#F7F7FA',
  plugins: {
    SplashScreen: { launchShowDuration: 1200, launchAutoHide: false, backgroundColor: '#F7F7FA', showSpinner: false, androidScaleType: 'CENTER_CROP' },
    StatusBar: { style: 'LIGHT', backgroundColor: '#F7F7FA', overlaysWebView: false },
    Keyboard: { resize: 'body', resizeOnFullScreen: true },
  },
  ios: { contentInset: 'automatic' },
};

export default config;

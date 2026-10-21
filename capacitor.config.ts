// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Capacitor (§14). appId = BUNDLE_ID [KONFIRMASI] — permanent after the first store upload (§16.3).
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: process.env.BUNDLE_ID ?? 'com.deasakakurniaputra.finandex',
  appName: 'Finandex',
  webDir: 'dist',
  server: { androidScheme: 'https' },
  plugins: {
    SplashScreen: { launchAutoHide: false, backgroundColor: '#0A0F0C', showSpinner: false },
    Keyboard: { resize: 'body' },
    StatusBar: { backgroundColor: '#0A0F0C' },
  },
  ios: { contentInset: 'always' },
};

export default config;

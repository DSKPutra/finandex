// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Install centre (§14.1): the primary button adapts to the device — Android (PWA prompt + Play badge when set), iPhone/
// iPad (3-step "Add to Home Screen" guide), in-app browsers ("open in Safari/Chrome" + copy link), macOS / Windows
// (desktop downloads from public/downloads/manifest.json, or "Segera hadir" + PWA fallback). Installed → hide CTAs and
// show "Terpasang". Desktop also shows a QR code to /install for phones. Separate PWA installs for My LAIwyer & FinLAIwyer.
import { clsx } from 'clsx';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { Button, Card } from '../../components/ui';
import { APP_VERSION, STORE_LINKS } from '../../config/runtime';
import { useQuery } from '@tanstack/react-query';
import { PRODUCTION_ORIGIN } from '../../config/runtime';
import type { DeviceProfile } from '../../lib/device';
import { canPromptInstall, currentDevice, onInstallPromptChange, promptInstall } from '../../lib/device';
import { useLocale } from '../../lib/locale';
import { useApp } from '../../lib/store';
import { formatNumber } from '../../shared/format';
import { TOKENS } from '../../config/brand';

type Downloads = { releases: { platform: string; version: string; date: string; files: { name: string; bytes: number; sha256: string | null; url: string; arch: string | null; requires: string }[] }[] };

/** public/downloads/manifest.json (same origin; native/desktop shells read it from production). */
function useDownloads(enabled = true) {
  return useQuery({
    queryKey: ['downloads-manifest'],
    enabled,
    staleTime: 600_000,
    queryFn: async () => {
      const local = typeof window !== 'undefined' && /^https?:/.test(window.location.protocol) ? '' : PRODUCTION_ORIGIN;
      const r = await fetch(`${local}/downloads/manifest.json`);
      if (!r.ok) throw new Error(String(r.status));
      return (await r.json()) as Downloads;
    },
  });
}

function useInstallPrompt() {
  const [can, setCan] = useState(canPromptInstall());
  useEffect(() => {
    const off = onInstallPromptChange(() => setCan(canPromptInstall()));
    return () => {
      off();
    };
  }, []);
  return can;
}

export function QrCode({ url, size = 132 }: { url: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    let on = true;
    // Always dark ink on light paper (light theme tokens) so phone cameras can scan it in either theme.
    void import('qrcode').then((q) => q.toDataURL(url, { margin: 1, width: size * 2, color: { dark: TOKENS.light.ink, light: TOKENS.light.pane } })).then((s) => on && setSrc(s));
    return () => {
      on = false;
    };
  }, [url, size]);
  if (!src) return <div style={{ width: size, height: size }} className="rounded-xl bg-pane-2" aria-hidden />;
  return <img src={src} alt={url} width={size} height={size} className="rounded-xl border border-edge" />;
}

type DlFile = { name: string; bytes: number; sha256: string | null; url: string; requires: string };
function Dl({ f }: { f: DlFile }) {
  const locale = useLocale();
  return (
    <li className="rounded-xl border border-edge p-3 text-sm">
      <a href={f.url} className="font-medium text-primary underline">
        {f.name}
      </a>
      <p className="text-xs text-ink-muted">
        {formatNumber(f.bytes / 1e6, locale, 1)} MB · {f.requires}
      </p>
      {f.sha256 && <p className="break-all font-mono text-[11px] text-ink-muted">SHA-256 {f.sha256}</p>}
    </li>
  );
}
function Soon() {
  const { t } = useTranslation();
  return <p className="text-sm text-flag">{t('install.soon')}</p>;
}

const label = (p: DeviceProfile) => ({ android: 'install.android', ios: 'install.ios', inapp: 'install.inapp', macos: 'install.macos', windows: 'install.windows', linux: 'install.linux', other: 'install.other' })[p];

/** Primary CTA for the current device (used by the home ribbon and /install). */
export function InstallCta({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();
  const device = currentDevice();
  const can = useInstallPrompt();
  const dl = useDownloads(device.profile === 'macos' || device.profile === 'windows');
  const [status, setStatus] = useState<string | null>(null);
  if (device.installed)
    return (
      <p className="text-sm text-primary">
        {t('install.installed', { version: APP_VERSION })}
      </p>
    );
  const desktop = dl.data?.releases.find((r) => r.platform === 'desktop');
  const file = desktop?.files.find((f) => (device.profile === 'macos' ? /\.dmg$/.test(f.name) : /\.(exe|msi)$/.test(f.name)));
  return (
    <div className={clsx('flex flex-wrap items-center gap-2', compact && 'text-sm')}>
      {device.profile === 'android' && (
        <Button variant="primary" disabled={!can} onClick={() => void promptInstall().then((o) => setStatus(t(`install.outcome_${o}`)))}>
          {t('install.android')}
        </Button>
      )}
      {device.profile === 'ios' && (
        <Link to="/install#ios" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-on-primary">
          {t('install.ios')}
        </Link>
      )}
      {device.profile === 'inapp' && (
        <Button
          variant="primary"
          onClick={() =>
            void navigator.clipboard?.writeText(window.location.origin + '/install').then(() => setStatus(t('install.copied')))
          }
        >
          {t('install.copyLink')}
        </Button>
      )}
      {(device.profile === 'macos' || device.profile === 'windows') &&
        (file ? (
          <a href={file.url} className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-on-primary">
            {t(label(device.profile))}
          </a>
        ) : can ? (
          <Button variant="primary" onClick={() => void promptInstall().then((o) => setStatus(t(`install.outcome_${o}`)))}>
            {t('install.pwa')}
          </Button>
        ) : (
          <Link to="/install" className="inline-flex min-h-11 items-center rounded-xl bg-primary px-4 text-sm font-medium text-on-primary">
            {t(label(device.profile))}
          </Link>
        ))}
      {(device.profile === 'linux' || device.profile === 'other') && (
        <Button variant="primary" disabled={!can} onClick={() => void promptInstall().then((o) => setStatus(t(`install.outcome_${o}`)))}>
          {t('install.pwa')}
        </Button>
      )}
      <Link to="/install" className="inline-flex min-h-11 items-center rounded-xl px-3 text-sm text-primary underline">
        {t('install.otherDevices')}
      </Link>
      {status && (
        <span role="status" className="text-xs text-ink-muted">
          {status}
        </span>
      )}
    </div>
  );
}

/** "Pasang Finandex" ribbon on the home page (hidden when installed; dismissible for 30 days). */
export function InstallRibbon() {
  const { t } = useTranslation();
  const until = useApp((s) => s.installRibbonUntil);
  const dismiss = useApp((s) => s.dismissInstallRibbon);
  const device = currentDevice();
  if (device.installed || (until && until > new Date().toISOString().slice(0, 10))) return null;
  const desktop = device.profile === 'macos' || device.profile === 'windows' || device.profile === 'linux';
  return (
    <section aria-labelledby="install-ribbon" className="pane flex flex-wrap items-center gap-4 p-4">
      <div className="min-w-0 flex-1">
        <h2 id="install-ribbon" className="font-display text-lg">
          {t('install.ribbonTitle')}
        </h2>
        <p className="text-sm text-ink-muted">{t('install.ribbonBody')}</p>
        <div className="mt-3">
          <InstallCta compact />
        </div>
      </div>
      {desktop && (
        <div className="hidden items-center gap-3 sm:flex">
          <QrCode url={`${typeof window === 'undefined' ? '' : window.location.origin}/install`} size={96} />
          <p className="max-w-[10rem] text-xs text-ink-muted">{t('install.scan')}</p>
        </div>
      )}
      <Button size="sm" variant="ghost" onClick={() => dismiss()} aria-label={t('install.dismiss')}>
        ✕
      </Button>
    </section>
  );
}

export function InstallCenter() {
  const { t } = useTranslation();
  const device = currentDevice();
  const dl = useDownloads();
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const rel = (p: string) => dl.data?.releases.find((r) => r.platform === p);
  const files = (p: string, re: RegExp) => rel(p)?.files.filter((f) => re.test(f.name)) ?? [];
  const cards: { id: DeviceProfile; title: string; body: React.ReactNode }[] = [
    {
      id: 'android',
      title: t('install.t_android'),
      body: (
        <>
          <p className="text-sm">{t('install.androidHow')}</p>
          {STORE_LINKS.playStore && (
            <a href={STORE_LINKS.playStore} className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-edge px-3 text-sm">
              Google Play
            </a>
          )}
          {STORE_LINKS.apkDirect && files('android', /\.apk$/).length > 0 && <ul className="mt-2 space-y-2">{files('android', /\.apk$/).map((f) => <Dl key={f.name} f={f} />)}</ul>}
        </>
      ),
    },
    {
      id: 'ios',
      title: t('install.t_ios'),
      body: (
        <>
          <ol id="ios" className="list-decimal space-y-1 pl-5 text-sm">
            <li>{t('install.ios1')}</li>
            <li>{t('install.ios2')}</li>
            <li>{t('install.ios3')}</li>
          </ol>
          {(STORE_LINKS.appStore || STORE_LINKS.testFlight) && (
            <a href={STORE_LINKS.appStore || STORE_LINKS.testFlight} className="mt-2 inline-flex min-h-11 items-center rounded-xl border border-edge px-3 text-sm">
              {STORE_LINKS.appStore ? 'App Store' : 'TestFlight'}
            </a>
          )}
        </>
      ),
    },
    { id: 'macos', title: t('install.t_macos'), body: files('desktop', /\.dmg$/).length ? <ul className="space-y-2">{files('desktop', /\.dmg$/).map((f) => <Dl key={f.name} f={f} />)}</ul> : <><Soon /><p className="mt-1 text-sm">{t('install.macPwa')}</p></> },
    { id: 'windows', title: t('install.t_windows'), body: files('desktop', /\.(exe|msi)$/).length ? <ul className="space-y-2">{files('desktop', /\.(exe|msi)$/).map((f) => <Dl key={f.name} f={f} />)}</ul> : <><Soon /><p className="mt-1 text-sm">{t('install.winPwa')}</p></> },
  ];
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl">{t('install.title')}</h1>
        <p className="measure text-ink-muted">{t('install.intro')}</p>
        <InstallCta />
        {device.profile === 'inapp' && <p className="prov-flag rounded-xl bg-pane-2 p-3 text-sm">{t('install.inappHelp', { app: device.inApp ?? '' })}</p>}
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((c) => (
          <Card key={c.id} className={clsx(device.profile === c.id && 'border-primary')}>
            <h2 className="mb-2 font-display text-lg">
              {c.title}
              {device.profile === c.id && <span className="ml-2 text-xs text-primary">{t('install.thisDevice')}</span>}
            </h2>
            {c.body}
          </Card>
        ))}
      </div>
      <Card>
        <h2 className="mb-2 font-display text-lg">{t('install.lawApps')}</h2>
        <p className="text-sm text-ink-muted">{t('install.lawAppsBody')}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <a href="/apps/mylaiwyer/" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-edge px-3 text-sm hover:bg-pane-2">
            <img src="/icons/mylaiwyer.svg" alt="" width={24} height={24} className="rounded-xl" /> My LAIwyer
          </a>
          <a href="/apps/finlaiwyer/" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-edge px-3 text-sm hover:bg-pane-2">
            <img src="/icons/finlaiwyer.svg" alt="" width={24} height={24} className="rounded-xl" /> FinLAIwyer
          </a>
        </div>
      </Card>
      <Card className="flex flex-wrap items-center gap-4">
        <QrCode url={`${origin}/install`} />
        <p className="max-w-sm text-sm text-ink-muted">{t('install.scanLong')}</p>
      </Card>
    </div>
  );
}

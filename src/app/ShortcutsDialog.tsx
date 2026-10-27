// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Keyboard shortcuts dialog (§10.9), loaded only when "?" is pressed.
import * as Dialog from '@radix-ui/react-dialog';
import { useTranslation } from 'react-i18next';
import { Button } from '../components/ui';

const SHORTCUTS: [string, string][] = [
  ['?', 'kb.help'],
  ['⌘K / Ctrl+K / /', 'kb.search'],
  ['g h', 'kb.home'],
  ['g d', 'kb.hub'],
  ['Esc', 'kb.close'],
  ['1–9', 'kb.chips'],
  ['← →', 'kb.slides'],
];

export default function ShortcutsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-field-0/80" />
        <Dialog.Content
          className="pane fixed left-1/2 top-[15vh] z-50 w-[min(92vw,28rem)] -translate-x-1/2 p-5"
          aria-describedby={undefined}
        >
          <Dialog.Title className="font-display text-lg">{t('kb.title')}</Dialog.Title>
          <dl className="mt-3 space-y-2 text-sm">
            {SHORTCUTS.map(([k, label]) => (
              <div key={k} className="flex items-center justify-between gap-4">
                <dt className="text-ink-muted">{t(label)}</dt>
                <dd>
                  <kbd className="rounded-xl border border-edge px-2 py-0.5 font-mono text-xs">{k}</kbd>
                </dd>
              </div>
            ))}
          </dl>
          <Dialog.Close asChild>
            <Button className="mt-4">{t('dex.close')}</Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Compare layer (§10.9) as one lazily loaded unit: the drag-and-drop context plus the floating tray. The app shell only
// mounts it on pages that offer "+ Banding" (Dex pages, market details) or when the tray already holds items, so the
// home page does not download dnd-kit, charts and tables.
import type { ReactNode } from 'react';
import { CompareDnd, CompareTray } from './CompareTray';

export default function CompareShell({ children }: { children: ReactNode }) {
  return (
    <CompareDnd>
      {children}
      <CompareTray />
    </CompareDnd>
  );
}

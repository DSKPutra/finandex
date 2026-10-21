// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Renders one ChartSpec: ECharts for plots (lazy), DataTable for tables, QuoteCard / InfoCard for law and info cards.
import { forwardRef, lazy, Suspense, useImperativeHandle, useRef } from 'react';
import type { ChartSpec } from '../../shared/chart-spec.ts';
import type { Locale } from '../../i18n/index.ts';
import { DataTable } from '../DataTable.tsx';
import { InfoCard, QuoteCard } from '../Cards.tsx';
import type { EChartHandle } from './EChart.tsx';

const EChart = lazy(() => import('./EChart.tsx'));

export interface ChartHandle {
  toDataUrl(): string | null;
}

export const ChartView = forwardRef<ChartHandle, { spec: ChartSpec; locale: Locale; height?: number; log?: boolean }>(
  function ChartView({ spec, locale, height = 300, log = false }, ref) {
    const inner = useRef<EChartHandle>(null);
    useImperativeHandle(ref, () => ({ toDataUrl: () => inner.current?.toDataUrl() ?? null }), []);
    if (spec.type === 'table') return <DataTable columns={spec.columns} rows={spec.rows} locale={locale} />;
    if (spec.type === 'quote') return <QuoteCard spec={spec} locale={locale} />;
    if (spec.type === 'card') return <InfoCard spec={spec} />;
    return (
      <Suspense fallback={<div className="skeleton" style={{ height }} />}>
        <EChart
          ref={inner}
          spec={spec}
          locale={locale}
          height={
            spec.type === 'bar' && spec.horizontal
              ? Math.max(height, Math.min(720, 28 * spec.categories.length + 40))
              : height
          }
          log={log}
        />
      </Suspense>
    );
  },
);

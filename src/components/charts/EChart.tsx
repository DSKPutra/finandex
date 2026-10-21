// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// ECharts host (canvas), re-themed on theme/colour-blind changes; exposes PNG export.
import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import type { ChartSpec } from '../../shared/chart-spec.ts';
import type { Locale } from '../../i18n/index.ts';
import { useSettings } from '../../lib/settings.ts';
import echarts from './echarts.ts';
import { themeColors, toOption } from './options.ts';

export interface EChartHandle {
  toDataUrl(): string | null;
}

const EChart = forwardRef<EChartHandle, { spec: ChartSpec; locale: Locale; height: number; log: boolean }>(
  function EChart({ spec, locale, height, log }, ref) {
    const el = useRef<HTMLDivElement>(null);
    const chart = useRef<ReturnType<typeof echarts.init> | null>(null);
    const theme = useSettings((s) => `${s.theme}:${s.colorblind}`);
    useImperativeHandle(
      ref,
      () => ({
        toDataUrl: () => chart.current?.getDataURL({ pixelRatio: 2, backgroundColor: themeColors().surface }) ?? null,
      }),
      [],
    );
    useEffect(() => {
      if (!el.current) return;
      const c = echarts.init(el.current, undefined, { renderer: 'canvas' });
      chart.current = c;
      const ro = new ResizeObserver(() => c.resize());
      ro.observe(el.current);
      return () => {
        ro.disconnect();
        c.dispose();
        chart.current = null;
      };
    }, []);
    useEffect(() => {
      const opt = toOption(spec, locale, themeColors(), log);
      if (opt) chart.current?.setOption(opt, true);
    }, [spec, locale, log, theme]);
    return <div ref={el} style={{ width: '100%', height }} aria-hidden="true" />;
  },
);

export default EChart;

// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// ChartSpec (zod, from tools) → ECharts option (§8.8 / §10.4): units, locale tooltips, toggleable legend, zoom for long
// series, log axis only when allowed and all values > 0, zero line for returns, event annotations, faint watermark.
import type { ChartSpec, ValueFormat } from '../../shared/chart-spec.ts';
import { CHART_PALETTE } from '../../config/brand.ts';
import { fmtDate } from '../../shared/format.ts';
import type { Locale } from '../../i18n/index.ts';
import { formatValue } from './format-value.ts';

type Opt = Record<string, unknown>;
interface Theme {
  text: string;
  muted: string;
  border: string;
  surface: string;
  negative: string;
  positive: string;
}

export function themeColors(): Theme {
  const cs = getComputedStyle(document.documentElement);
  const v = (n: string) => cs.getPropertyValue(n).trim() || '#888';
  return {
    text: v('--text'),
    muted: v('--text-muted'),
    border: v('--border'),
    surface: v('--surface'),
    negative: v('--negative'),
    positive: v('--positive'),
  };
}

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

export function toOption(spec: ChartSpec, locale: Locale, th: Theme, log = false): Opt | null {
  const fmt = (f: ValueFormat) => (v: unknown) => formatValue(v, f, locale);
  const axisLabel = { color: th.muted, fontSize: 11 };
  const split = { lineStyle: { color: th.border } };
  const base: Opt = {
    color: [...CHART_PALETTE],
    textStyle: { fontFamily: 'Inter, sans-serif', color: th.text },
    animation: false,
    graphic: [
      { type: 'text', right: 12, bottom: 8, style: { text: 'Finandex', fill: th.muted, opacity: 0.35, fontSize: 11 } },
    ],
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: th.surface,
      borderColor: th.border,
      textStyle: { color: th.text },
    },
  };
  const legend = (names: string[]) =>
    names.length > 1 ? { legend: { top: 0, textStyle: { color: th.muted }, type: 'scroll' } } : {};
  switch (spec.type) {
    case 'line': {
      const all = spec.series.flatMap((s) => s.y).filter((v): v is number => typeof v === 'number');
      const canLog = spec.log_allowed && all.length > 0 && all.every((v) => v > 0);
      const long = spec.x.length > 120;
      return {
        ...base,
        ...legend(spec.series.map((s) => s.name)),
        grid: { left: 8, right: 16, top: spec.series.length > 1 ? 32 : 16, bottom: long ? 56 : 28, containLabel: true },
        xAxis: {
          type: 'category',
          data: spec.x,
          boundaryGap: false,
          axisLabel: { ...axisLabel, formatter: (v: string) => (isDate(v) ? v.slice(0, 7) : v) },
          axisLine: { lineStyle: { color: th.border } },
        },
        yAxis: {
          type: canLog && log ? 'log' : 'value',
          scale: true,
          axisLabel: { ...axisLabel, formatter: fmt(spec.y_format) },
          splitLine: split,
        },
        tooltip: {
          ...(base.tooltip as Opt),
          valueFormatter: fmt(spec.y_format),
          axisPointer: {
            label: { formatter: (p: { value: string }) => (isDate(p.value) ? fmtDate(p.value, locale) : p.value) },
          },
        },
        ...(long ? { dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8 }] } : {}),
        series: spec.series.map((s, i) => ({
          name: s.name,
          type: 'line',
          data: s.y,
          step: s.step ? 'end' : false,
          showSymbol: spec.x.length < 40,
          connectNulls: false,
          lineStyle: { width: 1.6 },
          ...(s.area ? { areaStyle: { opacity: 0.18 } } : {}),
          ...(i === 0 && (spec.zero_line || spec.annotations?.length)
            ? {
                markLine: {
                  symbol: 'none',
                  silent: true,
                  label: { color: th.muted, fontSize: 10, formatter: '{b}' },
                  lineStyle: { color: th.muted, type: 'dashed' },
                  data: [
                    ...(spec.zero_line ? [{ yAxis: 0, name: '' }] : []),
                    ...(spec.annotations ?? []).map((a) => ({ xAxis: a.x, name: a.label })),
                  ],
                },
              }
            : {}),
          ...(i === 0 && spec.shaded?.length
            ? {
                markArea: {
                  silent: true,
                  itemStyle: { color: th.border },
                  label: { color: th.muted, fontSize: 10 },
                  data: spec.shaded.map((s) => [{ xAxis: s.from, name: s.label }, { xAxis: s.to }]),
                },
              }
            : {}),
        })),
      };
    }
    case 'candle':
      return {
        ...base,
        grid: { left: 8, right: 16, top: 16, bottom: 56, containLabel: true },
        xAxis: { type: 'category', data: spec.x, axisLabel },
        yAxis: {
          type: 'value',
          scale: true,
          axisLabel: { ...axisLabel, formatter: fmt(spec.y_format) },
          splitLine: split,
        },
        dataZoom: [{ type: 'inside' }, { type: 'slider', height: 18, bottom: 8 }],
        tooltip: { ...(base.tooltip as Opt), valueFormatter: fmt(spec.y_format) },
        series: [
          {
            type: 'candlestick',
            data: spec.x.map((_, i) => [spec.o[i], spec.c[i], spec.l[i], spec.h[i]]),
            itemStyle: { color: th.positive, color0: th.negative, borderColor: th.positive, borderColor0: th.negative },
          },
        ],
      };
    case 'bar': {
      const h = spec.horizontal;
      const cat = {
        type: 'category',
        data: spec.categories,
        inverse: h,
        axisLabel: { ...axisLabel, width: h ? 140 : 80, overflow: 'truncate' },
      };
      const val = {
        type: 'value',
        axisLabel: { ...axisLabel, formatter: fmt(spec.percent_stack ? 'num' : spec.value_format) },
        splitLine: split,
        ...(spec.percent_stack ? { max: 100 } : {}),
      };
      const series = spec.series.map((s) => {
        let data: (number | null)[] = s.values;
        if (spec.percent_stack)
          data = s.values.map((v, i) => {
            const tot = spec.series.reduce((a, x) => a + (x.values[i] ?? 0), 0);
            return v === null || !tot ? null : (v / tot) * 100;
          });
        return {
          name: s.name,
          type: 'bar',
          data,
          ...(spec.stacked ? { stack: 'all' } : {}),
          barMaxWidth: 28,
          label: {
            show: spec.series.length === 1 && spec.categories.length <= 15,
            position: h ? 'right' : 'top',
            color: th.muted,
            fontSize: 10,
            formatter: (p: { value: number }) =>
              spec.percent_stack ? `${p.value.toFixed(0)}%` : formatValue(p.value, spec.value_format, locale),
          },
        };
      });
      return {
        ...base,
        ...legend(spec.series.map((s) => s.name)),
        tooltip: {
          ...(base.tooltip as Opt),
          valueFormatter: spec.percent_stack ? (v: number) => `${v.toFixed(1)}%` : fmt(spec.value_format),
        },
        grid: { left: 8, right: h ? 56 : 16, top: spec.series.length > 1 ? 32 : 16, bottom: 16, containLabel: true },
        xAxis: h ? val : cat,
        yAxis: h ? cat : val,
        series,
      };
    }
    case 'heatmap': {
      const data: [number, number, number | null][] = [];
      spec.values.forEach((row, yi) => row.forEach((v, xi) => data.push([xi, yi, v])));
      return {
        ...base,
        tooltip: {
          trigger: 'item',
          confine: true,
          backgroundColor: th.surface,
          borderColor: th.border,
          textStyle: { color: th.text },
          formatter: (p: { value: [number, number, number | null] }) =>
            `${spec.y[p.value[1]]} · ${spec.x[p.value[0]]}<br/>${formatValue(p.value[2], spec.value_format, locale)}${spec.partial_x?.includes(spec.x[p.value[0]]!) ? ' (partial)' : ''}`,
        },
        grid: { left: 8, right: 16, top: 8, bottom: 48, containLabel: true },
        xAxis: {
          type: 'category',
          data: spec.x.map((x) => (spec.partial_x?.includes(x) ? `${x}*` : x)),
          axisLabel,
          splitArea: { show: true },
        },
        yAxis: { type: 'category', data: spec.y, axisLabel: { ...axisLabel, width: 120, overflow: 'truncate' } },
        visualMap: {
          min: spec.min,
          max: spec.max,
          calculable: false,
          orient: 'horizontal',
          left: 'center',
          bottom: 0,
          itemHeight: 120,
          textStyle: { color: th.muted },
          inRange: { color: spec.diverging ? [th.negative, th.surface, th.positive] : [th.surface, th.positive] },
        },
        series: [
          {
            type: 'heatmap',
            data,
            label: {
              show: spec.x.length * spec.y.length <= 120,
              fontSize: 9,
              color: th.text,
              formatter: (p: { value: [number, number, number | null] }) =>
                formatValue(p.value[2], spec.value_format === 'pct' ? 'pct' : 'num', locale),
            },
          },
        ],
      };
    }
    case 'histogram':
      return {
        ...base,
        grid: { left: 8, right: 16, top: 24, bottom: 16, containLabel: true },
        xAxis: {
          type: 'category',
          data: spec.bins.map((b) => formatValue((b.x0 + b.x1) / 2, spec.value_format, locale)),
          axisLabel,
        },
        yAxis: { type: 'value', axisLabel, splitLine: split },
        tooltip: {
          ...(base.tooltip as Opt),
          formatter: (ps: { dataIndex: number }[]) => {
            const b = spec.bins[ps[0]!.dataIndex]!;
            return `${formatValue(b.x0, spec.value_format, locale)} – ${formatValue(b.x1, spec.value_format, locale)}: ${b.count}`;
          },
        },
        series: [
          {
            type: 'bar',
            data: spec.bins.map((b) => b.count),
            barCategoryGap: '2%',
            ...(spec.median !== null
              ? {
                  markLine: {
                    symbol: 'none',
                    label: {
                      formatter: `median ${formatValue(spec.median, spec.value_format, locale)} · n=${spec.n}`,
                      color: th.muted,
                    },
                    lineStyle: { color: th.text, type: 'dashed' },
                    data: [
                      {
                        xAxis: Math.max(
                          0,
                          spec.bins.findIndex((b) => spec.median! >= b.x0 && spec.median! <= b.x1),
                        ),
                      },
                    ],
                  },
                }
              : {}),
          },
        ],
      };
    case 'graph': {
      const maxV = Math.max(1, ...spec.nodes.map((n) => n.value));
      const maxE = Math.max(1, ...spec.edges.map((e) => e.value));
      return {
        ...base,
        tooltip: { trigger: 'item', confine: true },
        series: [
          {
            type: 'graph',
            layout: 'force',
            roam: true,
            force: { repulsion: 120, edgeLength: [40, 140] },
            label: { show: true, color: th.text, fontSize: 10 },
            data: spec.nodes.map((n) => ({
              id: n.id,
              name: n.label,
              value: n.value,
              symbolSize: 8 + 26 * Math.sqrt(n.value / maxV),
              itemStyle: n.center ? { color: CHART_PALETTE[0] } : { color: CHART_PALETTE[1] },
            })),
            links: spec.edges.map((e) => ({
              source: e.source,
              target: e.target,
              value: e.value,
              lineStyle: { width: 0.5 + 4 * (e.value / maxE), color: th.muted, opacity: 0.6 },
            })),
          },
        ],
      };
    }
    case 'map': {
      const groups = [...new Set(spec.points.map((p) => p.group ?? ''))];
      return {
        ...base,
        ...legend(groups),
        tooltip: {
          trigger: 'item',
          confine: true,
          formatter: (p: { data: { label: string; v: number | null } }) =>
            `${p.data.label}<br/>${formatValue(p.data.v, spec.value_format, locale)}`,
        },
        grid: { left: 8, right: 16, top: groups.length > 1 ? 32 : 8, bottom: 16, containLabel: true },
        xAxis: { type: 'value', scale: true, name: 'lon', axisLabel, splitLine: split },
        yAxis: { type: 'value', scale: true, name: 'lat', axisLabel, splitLine: split },
        series: groups.map((g) => ({
          name: g || 'points',
          type: 'scatter',
          symbolSize: 5,
          data: spec.points
            .filter((p) => (p.group ?? '') === g)
            .map((p) => ({ value: [p.lon, p.lat], label: p.label, v: p.value })),
        })),
      };
    }
    default:
      return null;
  }
}

/** Tabular data behind a chart (CSV export and the screen-reader table). */
export function specTable(spec: ChartSpec): { columns: string[]; rows: unknown[][] } {
  switch (spec.type) {
    case 'line':
      return {
        columns: ['x', ...spec.series.map((s) => s.name)],
        rows: spec.x.map((x, i) => [x, ...spec.series.map((s) => s.y[i])]),
      };
    case 'candle':
      return {
        columns: ['date', 'open', 'high', 'low', 'close'],
        rows: spec.x.map((x, i) => [x, spec.o[i], spec.h[i], spec.l[i], spec.c[i]]),
      };
    case 'bar':
      return {
        columns: ['category', ...spec.series.map((s) => s.name)],
        rows: spec.categories.map((c, i) => [c, ...spec.series.map((s) => s.values[i])]),
      };
    case 'heatmap':
      return { columns: ['', ...spec.x], rows: spec.y.map((y, i) => [y, ...(spec.values[i] ?? [])]) };
    case 'histogram':
      return { columns: ['from', 'to', 'count'], rows: spec.bins.map((b) => [b.x0, b.x1, b.count]) };
    case 'table':
      return {
        columns: spec.columns.map((c) => c.label || c.key),
        rows: spec.rows.map((r) => spec.columns.map((c) => r[c.key])),
      };
    case 'graph':
      return { columns: ['source', 'target', 'value'], rows: spec.edges.map((e) => [e.source, e.target, e.value]) };
    case 'map':
      return {
        columns: ['label', 'lat', 'lon', 'value', 'group'],
        rows: spec.points.map((p) => [p.label, p.lat, p.lon, p.value, p.group ?? '']),
      };
    case 'quote':
      return { columns: ['doc', 'pasal', 'page', 'text'], rows: [[spec.doc_title, spec.pasal, spec.page, spec.text]] };
    case 'card':
      return { columns: ['text'], rows: [[spec.body], ...(spec.items ?? []).map((i) => [i])] };
  }
}

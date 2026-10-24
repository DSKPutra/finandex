// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// ChartSpec (renderer-neutral, zod-validated, from tools) → ECharts option (§8.8, §10.4).
// Pure function: unit-tested; theme colours are passed in (read from CSS variables at runtime).
import type { Locale } from '../../config/brand';
import { CHART_PALETTE } from '../../config/brand';
import type { ChartSpec } from '../../shared/chat-protocol';
import { formatDate } from '../../shared/format';
import { axisValue, formatValue } from './format';

export type ChartColors = { text: string; muted: string; border: string; surface: string; positive: string; negative: string; brand: string; info: string; warning: string; palette?: string[] };

type Opt = Record<string, unknown>;

const isDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

function base(c: ChartColors): Opt {
  return {
    color: c.palette?.length ? c.palette : [...CHART_PALETTE],
    backgroundColor: 'transparent',
    textStyle: { color: c.text, fontFamily: 'IBM Plex Sans, system-ui, sans-serif' },
    animationDuration: 300,
    graphic: [{ type: 'text', right: 12, bottom: 8, silent: true, style: { text: 'Finandex', fill: c.muted, opacity: 0.35, fontSize: 11 } }],
  };
}

const axisCommon = (c: ChartColors) => ({
  axisLine: { lineStyle: { color: c.border } },
  axisLabel: { color: c.muted },
  splitLine: { lineStyle: { color: c.border } },
});

function tooltip(c: ChartColors, extra: Opt = {}): Opt {
  return { trigger: 'axis', backgroundColor: c.surface, borderColor: c.border, textStyle: { color: c.text }, confine: true, ...extra };
}

/** Logarithmic y only when every value is > 0 (§10.4). */
export function canLog(series: { data: (number | null)[] }[]): boolean {
  return series.every((s) => s.data.every((v) => v === null || v > 0));
}

export function toOption(spec: ChartSpec, c: ChartColors, locale: Locale, opts: { log?: boolean } = {}): Opt {
  const fmtX = (x: string) => (isDate(x) ? formatDate(x, locale, 'short') : x);
  switch (spec.type) {
    case 'line': {
      const unit = spec.yUnit;
      const long = spec.x.length > 120;
      const log = !!opts.log && !!spec.logAllowed && canLog(spec.series);
      return {
        ...base(c),
        legend: spec.series.length > 1 ? { textStyle: { color: c.muted }, type: 'scroll', top: 0 } : undefined,
        grid: { left: 8, right: 16, top: spec.series.length > 1 ? 32 : 16, bottom: long ? 56 : 24, containLabel: true },
        tooltip: tooltip(c, {
          valueFormatter: (v: number | null) => formatValue(v, unit, locale, spec.currency),
          axisPointer: { type: 'line' },
        }),
        xAxis: { type: 'category', data: spec.x, boundaryGap: false, ...axisCommon(c), axisLabel: { color: c.muted, formatter: fmtX, hideOverlap: true } },
        yAxis: {
          type: log ? 'log' : 'value',
          scale: !spec.zeroLine && unit !== 'pct',
          ...axisCommon(c),
          axisLabel: { color: c.muted, formatter: (v: number) => axisValue(v, unit, locale, spec.currency) },
        },
        graphic: spec.series.some((s) => s.marker?.includes('headline'))
          ? [...(base(c).graphic as Opt[]), { type: 'text', left: 12, bottom: long ? 34 : 4, silent: true, style: { text: locale === 'id' ? '◆ = angka dari judul berita saja' : '◆ = figure from a news headline only', fill: c.warning, fontSize: 11 } }]
          : base(c).graphic,
        dataZoom: long ? [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 8, textStyle: { color: c.muted }, borderColor: c.border }] : undefined,
        series: spec.series.map((s, i) => ({
          name: s.name,
          type: 'line',
          // Points sourced from a news headline only get a distinct --flag diamond (§4.29).
          data: s.marker ? s.data.map((v, j) => (s.marker![j] === 'headline' ? { value: v, symbol: 'diamond', symbolSize: 11, itemStyle: { color: c.warning } } : { value: v, symbol: 'circle', symbolSize: 7 })) : s.data,
          step: s.step ? 'end' : undefined,
          showSymbol: !!s.marker,
          connectNulls: false,
          sampling: 'lttb',
          lineStyle: { width: 1.75 },
          areaStyle: s.area ? { opacity: 0.12 } : undefined,
          markLine:
            i === 0 && (spec.zeroLine || spec.marks?.length)
              ? {
                  symbol: 'none',
                  silent: true,
                  label: { color: c.muted, fontSize: 10, formatter: '{b}' },
                  lineStyle: { color: c.muted, type: 'dashed' },
                  data: [...(spec.zeroLine ? [{ yAxis: 0, name: '' }] : []), ...(spec.marks ?? []).map((m) => ({ xAxis: m.x, name: m.label }))],
                }
              : undefined,
        })),
      };
    }
    case 'candle':
      return {
        ...base(c),
        grid: { left: 8, right: 16, top: 16, bottom: 56, containLabel: true },
        tooltip: tooltip(c),
        xAxis: { type: 'category', data: spec.x, ...axisCommon(c), axisLabel: { color: c.muted, formatter: fmtX, hideOverlap: true } },
        yAxis: { type: 'value', scale: true, ...axisCommon(c) },
        dataZoom: [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 8, borderColor: c.border }],
        // ECharts candlestick order: [open, close, low, high]; spec is [o, h, l, c].
        series: [
          {
            name: spec.name,
            type: 'candlestick',
            data: spec.ohlc.map((r) => (r ? [r[0], r[3], r[2], r[1]] : '-')),
            itemStyle: { color: c.positive, color0: c.negative, borderColor: c.positive, borderColor0: c.negative },
          },
        ],
      };
    case 'bar': {
      const unit = spec.yUnit;
      const valueAxis = {
        type: 'value',
        ...axisCommon(c),
        max: spec.stacked && unit === 'pct' ? 1 : undefined,
        axisLabel: { color: c.muted, formatter: (v: number) => axisValue(v, unit, locale, spec.currency) },
      };
      const catAxis = {
        type: 'category',
        data: spec.categories.map(fmtX),
        inverse: !!spec.horizontal,
        ...axisCommon(c),
        axisLabel: { color: c.muted, hideOverlap: !spec.horizontal, width: spec.horizontal ? 140 : undefined, overflow: 'truncate' },
      };
      const many = spec.categories.length > 30 && !spec.horizontal;
      return {
        ...base(c),
        legend: spec.series.length > 1 ? { textStyle: { color: c.muted }, type: 'scroll', top: 0 } : undefined,
        grid: { left: 8, right: 48, top: spec.series.length > 1 ? 32 : 16, bottom: many ? 56 : 24, containLabel: true },
        tooltip: tooltip(c, { axisPointer: { type: 'shadow' }, valueFormatter: (v: number | null) => formatValue(v, unit, locale, spec.currency) }),
        xAxis: spec.horizontal ? valueAxis : catAxis,
        yAxis: spec.horizontal ? catAxis : valueAxis,
        dataZoom: many ? [{ type: 'inside' }, { type: 'slider', height: 20, bottom: 8, borderColor: c.border }] : undefined,
        series: spec.series.map((s, i) => ({
          name: s.name,
          type: 'bar',
          data: s.data,
          stack: spec.stacked ? 'total' : undefined,
          barMaxWidth: 28,
          label:
            !spec.stacked && spec.series.length === 1 && spec.categories.length <= 25
              ? { show: true, position: spec.horizontal ? 'right' : 'top', color: c.muted, fontSize: 10, formatter: (p: { value: number | null }) => formatValue(p.value, unit, locale, spec.currency) }
              : undefined,
          markLine:
            i === 0 && spec.medianLine !== undefined
              ? { symbol: 'none', silent: true, lineStyle: { color: c.brand, type: 'dashed' }, label: { color: c.muted, formatter: `median ${formatValue(spec.medianLine, unit, locale, spec.currency)}` }, data: [spec.horizontal ? { xAxis: spec.medianLine } : { yAxis: spec.medianLine }] }
              : undefined,
        })),
      };
    }
    case 'heatmap': {
      const data: [number, number, number | null][] = [];
      spec.values.forEach((row, yi) => row.forEach((v, xi) => data.push([xi, yi, v])));
      const showLabels = spec.x.length * spec.y.length <= 400;
      const diverging = spec.range[0] < 0;
      return {
        ...base(c),
        grid: { left: 8, right: 16, top: 16, bottom: 64, containLabel: true },
        tooltip: {
          backgroundColor: c.surface,
          borderColor: c.border,
          textStyle: { color: c.text },
          formatter: (p: { value: [number, number, number | null] }) => `${spec.y[p.value[1]]} × ${spec.x[p.value[0]]}<br/>${formatValue(p.value[2], spec.unit, locale)}`,
        },
        xAxis: { type: 'category', data: spec.x.map((x) => (spec.partial?.includes(x) ? `${x}*` : x)), ...axisCommon(c), axisLabel: { color: c.muted, rotate: spec.x.length > 8 ? 45 : 0 }, splitArea: { show: false } },
        yAxis: { type: 'category', data: spec.y, ...axisCommon(c) },
        visualMap: {
          min: spec.range[0],
          max: spec.range[1],
          calculable: true,
          orient: 'horizontal',
          left: 'center',
          bottom: 0,
          textStyle: { color: c.muted },
          inRange: { color: diverging ? [c.negative, c.surface, c.positive] : [c.surface, c.info] },
          formatter: (v: number) => axisValue(v, spec.unit, locale),
        },
        series: [
          {
            type: 'heatmap',
            data,
            label: { show: showLabels, color: c.text, fontSize: 9, formatter: (p: { value: [number, number, number | null] }) => (p.value[2] === null ? '' : spec.unit === 'pct' ? axisValue(p.value[2], 'pct', locale) : (Math.round(p.value[2] * 100) / 100).toString()) },
          },
        ],
      };
    }
    case 'graph': {
      const max = Math.max(1, ...spec.nodes.map((n) => n.size));
      const maxW = Math.max(1, ...spec.edges.map((e) => e.weight));
      const groups = [...new Set(spec.nodes.map((n) => n.group ?? ''))];
      return {
        ...base(c),
        tooltip: { backgroundColor: c.surface, borderColor: c.border, textStyle: { color: c.text } },
        legend: groups.length > 1 ? { data: groups, textStyle: { color: c.muted }, top: 0 } : undefined,
        series: [
          {
            type: 'graph',
            layout: 'force',
            roam: true,
            draggable: true,
            categories: groups.map((g) => ({ name: g })),
            force: { repulsion: 140, edgeLength: [40, 140] },
            label: { show: spec.nodes.length <= 30, color: c.text, fontSize: 10, position: 'right' },
            data: spec.nodes.map((n) => ({ id: n.id, name: n.label, value: n.size, symbolSize: 8 + 28 * Math.sqrt(n.size / max), category: groups.indexOf(n.group ?? '') })),
            links: spec.edges.map((e) => ({ source: e.source, target: e.target, value: e.weight, lineStyle: { width: 0.5 + 5 * (e.weight / maxW), color: c.muted, opacity: 0.6 } })),
          },
        ],
      };
    }
    case 'map': {
      // No bundled geometry: countries/provinces render as a ranked bar (§8.8 fallback); points as lon/lat scatter.
      if (spec.level === 'points') {
        const pts = spec.points ?? [];
        return {
          ...base(c),
          grid: { left: 8, right: 16, top: 16, bottom: 24, containLabel: true },
          tooltip: { backgroundColor: c.surface, borderColor: c.border, textStyle: { color: c.text }, formatter: (p: { data: { name: string; v: number | null } }) => `${p.data.name}<br/>${formatValue(p.data.v, spec.unit, locale)}` },
          xAxis: { type: 'value', name: 'lon', scale: true, ...axisCommon(c) },
          yAxis: { type: 'value', name: 'lat', scale: true, ...axisCommon(c) },
          series: [{ type: 'scatter', symbolSize: 6, data: pts.map((p) => ({ value: [p.lon, p.lat], name: p.label, v: p.value })) }],
        };
      }
      const vals = [...(spec.values ?? [])].filter((v) => v.value !== null).sort((a, b) => (b.value ?? 0) - (a.value ?? 0)).slice(0, 40);
      return toOption({ type: 'bar', categories: vals.map((v) => v.label ?? v.key), series: [{ name: spec.unit ?? '', data: vals.map((v) => v.value) }], horizontal: true }, c, locale);
    }
    default:
      return base(c);
  }
}

/** One-sentence text alternative for screen readers (§8.8). */
export function describeSpec(spec: ChartSpec, title: string, locale: Locale): string {
  const id = locale === 'id';
  switch (spec.type) {
    case 'line': {
      const s = spec.series[0];
      const vals = (s?.data ?? []).filter((v): v is number => v !== null);
      const first = vals[0];
      const last = vals.at(-1);
      return `${title}: ${spec.series.length} ${id ? 'seri' : 'series'}, ${spec.x[0] ?? ''}–${spec.x.at(-1) ?? ''}${first !== undefined && last !== undefined ? `; ${s!.name} ${formatValue(first, spec.yUnit, locale)} → ${formatValue(last, spec.yUnit, locale)}` : ''}.`;
    }
    case 'bar':
      return `${title}: ${spec.categories.length} ${id ? 'kategori' : 'categories'}${spec.categories[0] ? `; ${id ? 'pertama' : 'first'} ${spec.categories[0]} ${formatValue(spec.series[0]?.data[0], spec.yUnit, locale)}` : ''}.`;
    case 'heatmap':
      return `${title}: ${spec.y.length} × ${spec.x.length}.`;
    case 'candle':
      return `${title}: ${spec.x.length} ${id ? 'candle' : 'candles'}, ${spec.x[0] ?? ''}–${spec.x.at(-1) ?? ''}.`;
    case 'graph':
      return `${title}: ${spec.nodes.length} ${id ? 'simpul' : 'nodes'}, ${spec.edges.length} ${id ? 'relasi' : 'edges'}.`;
    default:
      return title;
  }
}

/** Flattens a spec to rows for the hidden accessible table and CSV export. */
export function specRows(spec: ChartSpec): { columns: string[]; rows: (string | number | boolean | null)[][] } {
  switch (spec.type) {
    case 'line':
      return { columns: ['x', ...spec.series.map((s) => s.name)], rows: spec.x.map((x, i) => [x, ...spec.series.map((s) => s.data[i] ?? null)]) };
    case 'candle':
      return { columns: ['date', 'open', 'high', 'low', 'close'], rows: spec.x.map((x, i) => [x, ...(spec.ohlc[i] ?? [null, null, null, null])]) };
    case 'bar':
      return { columns: ['category', ...spec.series.map((s) => s.name)], rows: spec.categories.map((cat, i) => [cat, ...spec.series.map((s) => s.data[i] ?? null)]) };
    case 'heatmap':
      return { columns: ['', ...spec.x], rows: spec.y.map((y, i) => [y, ...(spec.values[i] ?? [])]) };
    case 'table':
      return { columns: spec.columns.map((c) => c.label), rows: spec.rows.map((r) => spec.columns.map((c) => r[c.key] ?? null)) };
    case 'graph':
      return { columns: ['source', 'target', 'weight'], rows: spec.edges.map((e) => [e.source, e.target, e.weight]) };
    case 'map':
      return spec.level === 'points'
        ? { columns: ['label', 'lat', 'lon', 'value'], rows: (spec.points ?? []).map((p) => [p.label, p.lat, p.lon, p.value]) }
        : { columns: ['key', 'label', 'value'], rows: (spec.values ?? []).map((v) => [v.key, v.label ?? v.key, v.value]) };
    case 'quote':
      return { columns: ['doc_id', 'pasal', 'page', 'text'], rows: [[spec.doc_id, spec.pasal, spec.page, spec.text]] };
    case 'card':
      return { columns: ['text'], rows: [[spec.body], ...(spec.items ?? []).map((i) => [i]), ...(spec.functions ?? []).map((f) => [`${f.tab}: ${f.what}`])] };
    case 'steps':
      return { columns: ['n', 'step', 'urgent', 'channels'], rows: spec.steps.map((s, i) => [i + 1, s.text, s.urgent, s.channels.map((c) => c.url ?? c.phone ?? c.name).join(' | ')]) };
    case 'choices':
      return { columns: ['n', 'option'], rows: spec.options.length ? spec.options.map((o) => [o.index + 1, o.label]) : (spec.flows ?? []).map((f, i) => [i + 1, f.title]) };
    case 'timeline':
      return { columns: ['date', 'document', 'relation', 'status'], rows: spec.items.map((x) => [x.date, x.label, x.relation, x.status ?? null]) };
    case 'gauge':
      return { columns: ['label', 'value', 'numerator', 'denominator', 'cutoff'], rows: [[spec.label, spec.value, spec.numerator.value, spec.denominator.value, spec.cutoff]] };
    case 'compare_text':
      return { columns: ['document', 'pasal', 'page', 'text'], rows: [spec.left, spec.right].map((s) => [s.label, s.pasal, s.page, s.text]) };
  }
}

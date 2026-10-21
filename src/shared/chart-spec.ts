// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// Chart / artifact specification (§8.2 `artifact`, §8.8). Tools emit these (validated by zod); the client renders
// them with ECharts. Kept declarative so the server never ships executable chart code.
import { z } from 'zod';

export const ValueFormat = z.enum([
  'pct',
  'pct_points',
  'pp',
  'num',
  'int',
  'price',
  'money_idr',
  'money_usd',
  'compact',
  'text',
  'date',
]);
export type ValueFormat = z.infer<typeof ValueFormat>;
const num = z.number().finite().nullable();

const LineSpec = z.object({
  type: z.literal('line'),
  x: z.array(z.string()),
  series: z
    .array(z.object({ name: z.string(), y: z.array(num), step: z.boolean().optional(), area: z.boolean().optional() }))
    .min(1)
    .max(8),
  y_format: ValueFormat,
  log_allowed: z.boolean(),
  zero_line: z.boolean().optional(),
  annotations: z.array(z.object({ x: z.string(), label: z.string() })).optional(),
  shaded: z.array(z.object({ from: z.string(), to: z.string(), label: z.string() })).optional(),
  rebased: z.boolean().optional(),
});
const CandleSpec = z.object({
  type: z.literal('candle'),
  x: z.array(z.string()),
  o: z.array(num),
  h: z.array(num),
  l: z.array(num),
  c: z.array(num),
  y_format: ValueFormat,
});
const BarSpec = z.object({
  type: z.literal('bar'),
  categories: z.array(z.string()),
  series: z
    .array(z.object({ name: z.string(), values: z.array(num) }))
    .min(1)
    .max(8),
  horizontal: z.boolean(),
  stacked: z.boolean().optional(),
  percent_stack: z.boolean().optional(),
  value_format: ValueFormat,
});
const HeatmapSpec = z.object({
  type: z.literal('heatmap'),
  x: z.array(z.string()),
  y: z.array(z.string()),
  values: z.array(z.array(num)),
  value_format: ValueFormat,
  min: z.number(),
  max: z.number(),
  diverging: z.boolean(),
  partial_x: z.array(z.string()).optional(),
});
const HistogramSpec = z.object({
  type: z.literal('histogram'),
  bins: z.array(z.object({ x0: z.number(), x1: z.number(), count: z.number().int() })),
  median: num,
  n: z.number().int(),
  value_format: ValueFormat,
});
const TableSpec = z.object({
  type: z.literal('table'),
  columns: z.array(z.object({ key: z.string(), label: z.string(), format: ValueFormat })),
  rows: z.array(z.record(z.string(), z.unknown())).max(500),
});
const GraphSpec = z.object({
  type: z.literal('graph'),
  nodes: z
    .array(z.object({ id: z.string(), label: z.string(), value: z.number(), center: z.boolean().optional() }))
    .max(51),
  edges: z.array(z.object({ source: z.string(), target: z.string(), value: z.number() })),
});
const MapSpec = z.object({
  type: z.literal('map'),
  points: z
    .array(z.object({ lat: z.number(), lon: z.number(), value: num, label: z.string(), group: z.string().optional() }))
    .max(2000),
  value_format: ValueFormat,
});
const QuoteSpec = z.object({
  type: z.literal('quote'),
  doc_id: z.string(),
  doc_title: z.string(),
  label: z.string(),
  pasal: z.string().nullable(),
  page: z.number().int(),
  text: z.string(),
  note: z.string().nullable(),
});
const CardSpec = z.object({
  type: z.literal('card'),
  body: z.string(),
  tone: z.enum(['info', 'warning', 'pending']),
  link: z.object({ dex: z.string(), entity: z.string().nullable(), label: z.string() }).nullable(),
  items: z.array(z.string()).optional(),
});

export const ChartSpec = z.discriminatedUnion('type', [
  LineSpec,
  CandleSpec,
  BarSpec,
  HeatmapSpec,
  HistogramSpec,
  TableSpec,
  GraphSpec,
  MapSpec,
  QuoteSpec,
  CardSpec,
]);
export type ChartSpec = z.infer<typeof ChartSpec>;

export const ArtifactSchema = z.object({
  id: z.string(),
  kind: z.enum(['line', 'candle', 'bar', 'heatmap', 'histogram', 'table', 'graph', 'map', 'quote', 'card']),
  title: z.string(),
  summary: z.string(),
  spec: ChartSpec,
  source: z.object({ dex: z.string(), dataset: z.string(), as_of: z.string().nullable() }),
  open_tab: z.object({ tab: z.string(), entity: z.string().nullable() }).nullable(),
});
export type Artifact = z.infer<typeof ArtifactSchema>;

export const MethodSchema = z.object({
  tool: z.string(),
  formula_ids: z.array(z.string()),
  steps: z.array(z.object({ id: z.string(), en: z.string() })),
  inputs: z.record(z.string(), z.unknown()),
  rows_used: z.number().int().nonnegative(),
  period: z.object({ start: z.string().nullable(), end: z.string().nullable() }).nullable(),
  dataset: z.string(),
  as_of: z.string().nullable(),
  flags: z.array(z.string()),
});
export type Method = z.infer<typeof MethodSchema>;

// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// IDHousingDex — file #29 (§4.19). Port of run_housing() in kit/reference/finandex_reference_x.py.
import { fnum, med, valueCounts } from '../../../src/shared/analytics/stats.ts';
import { isNA, num, readCsv, str, type Row } from '../lib/csv.ts';
import { columnar, numericColumns, rowKey } from '../lib/frame.ts';
import { x } from '../lib/io.ts';
import type { DexModule, ModuleResult } from '../lib/module.ts';

const CSV = () => x('Indonesia_Affordable_Housing', 'indonesia_housing_dataset.csv');
export const HOUSING_PRICE_MIN = 50_000_000;
export const HOUSING_PRICE_MAX = 100_000_000_000;
export const ID_LAT: [number, number] = [-11.5, 6.5];
export const ID_LON: [number, number] = [94.0, 141.5];

/** pandas Series.mode(): most frequent values, smallest first. */
function mode(xs: number[]): number {
  const m = new Map<number, number>();
  for (const v of xs) if (!Number.isNaN(v)) m.set(v, (m.get(v) ?? 0) + 1);
  let best = NaN;
  let bc = -1;
  for (const [v, c] of m) if (c > bc || (c === bc && v < best)) [best, bc] = [v, c];
  return best;
}

export const housingModule: DexModule = {
  name: 'housing',
  dex: ['idhousingdex'],
  inputs: [29],
  requires: () => [CSV()],
  async build(): Promise<ModuleResult> {
    const raw = readCsv(CSV());
    const cols = Object.keys(raw[0]!);
    const numeric = numericColumns(raw, cols, isNA);
    const seen = new Set<string>();
    const df: Row[] = [];
    for (const r of raw) {
      const k = rowKey(r, cols, numeric, isNA);
      if (seen.has(k)) continue;
      seen.add(k);
      df.push(r);
    }
    const price = (r: Row) => num(r.price_idr);
    const valid = (r: Row) => price(r) >= HOUSING_PRICE_MIN && price(r) <= HOUSING_PRICE_MAX;
    const geoOk = (r: Row) => num(r.latitude) >= ID_LAT[0] && num(r.latitude) <= ID_LAT[1] && num(r.longitude) >= ID_LON[0] && num(r.longitude) <= ID_LON[1];
    const v = df.filter(valid);
    const vb = v.filter((r) => num(r.building_area_m2) > 0);
    const ppm2 = (r: Row) => price(r) / num(r.building_area_m2);
    const provCounts = valueCounts(df.map((r) => str(r.province)));
    const subsidiMedByProv = (p: string) => med(v.filter((r) => r.province === p && r.subsidy_status === 'subsidi').map(price));
    const statuses = [...new Set(v.map((r) => str(r.subsidy_status)).filter((s): s is string => s !== null))].sort();
    const golden = {
      rows_raw: raw.length,
      exact_duplicates_removed: raw.length - df.length,
      rows: df.length,
      price_invalid_rows: df.filter((r) => !valid(r)).length,
      geo_invalid_or_missing_rows: df.filter((r) => !geoOk(r)).length,
      provinces: new Set(df.map((r) => str(r.province)).filter((s) => s !== null)).size,
      city_regency: new Set(df.map((r) => str(r.city_regency)).filter((s) => s !== null)).size,
      projects: new Set(df.map((r) => str(r.housing_name)).filter((s) => s !== null)).size,
      developers: new Set(df.map((r) => str(r.developer_name)).filter((s) => s !== null)).size,
      subsidy_counts: Object.fromEntries(valueCounts(df.map((r) => str(r.subsidy_status)))),
      median_price_by_subsidy_idr: Object.fromEntries(statuses.map((s) => [s, med(v.filter((r) => r.subsidy_status === s).map(price))])),
      median_price_per_m2_building_by_subsidy_idr: Object.fromEntries(['subsidi', 'komersil'].map((s) => [s, med(vb.filter((r) => r.subsidy_status === s).map(ppm2))])),
      top10_provinces_by_listings: Object.fromEntries(provCounts.slice(0, 10)),
      median_subsidi_price_by_province_top10_listings: Object.fromEntries(provCounts.slice(0, 10).map(([p]) => [p, subsidiMedByProv(p)])),
      developer_association_share: Object.fromEntries(
        valueCounts(df.map((r) => str(r.developer_association)))
          .slice(0, 8)
          .map(([k, c]) => [k, fnum(c / df.length)]),
      ),
      median_building_area_m2_subsidi: med(v.filter((r) => r.subsidy_status === 'subsidi').map((r) => num(r.building_area_m2))),
      median_land_area_m2_subsidi: med(v.filter((r) => r.subsidy_status === 'subsidi').map((r) => num(r.land_area_m2))),
      bedrooms_mode_subsidi: mode(v.filter((r) => r.subsidy_status === 'subsidi').map((r) => num(r.bedrooms))),
      rules: {
        dedup: 'drop exact duplicate rows',
        price_valid: `${HOUSING_PRICE_MIN} <= price_idr <= ${HOUSING_PRICE_MAX}`,
        geo: 'lat in [-11.5, 6.5] and lon in [94, 141.5]; otherwise not plotted',
        bedrooms_0: '0 = not reported',
        price_per_m2: 'recompute from price_idr / area (area > 0); dataset columns are kept only for cross-check',
      },
      notes: {
        csv_multiline: 'CSV has quoted multi-line fields: wc -l (134,185) != rows; always use a real CSV parser',
        property_type: "single value 'Rumah Tapak'",
        subsidy_status: "'subsidi' or 'komersil' (as written in the data)",
      },
    };
    const listings = df.map((r) => {
      const ok = valid(r);
      const ba = num(r.building_area_m2);
      const la = num(r.land_area_m2);
      return {
        name: str(r.housing_name),
        subsidy: str(r.subsidy_status),
        province: str(r.province),
        city: str(r.city_regency),
        district: str(r.district),
        lat: geoOk(r) ? num(r.latitude) : null,
        lon: geoOk(r) ? num(r.longitude) : null,
        price_idr: ok ? price(r) : null,
        price_invalid: !ok,
        land_m2: la,
        building_m2: ba,
        price_per_m2_building: ok && ba > 0 ? price(r) / ba : null,
        price_per_m2_land: ok && la > 0 ? price(r) / la : null,
        bedrooms: num(r.bedrooms) > 0 ? num(r.bedrooms) : null,
        bathrooms: num(r.bathrooms) > 0 ? num(r.bathrooms) : null,
        floors: num(r.floors),
        roof: str(r.roof_material),
        wall: str(r.wall_material),
        floor: str(r.floor_material),
        foundation: str(r.foundation_material),
        developer: str(r.developer_name),
        association: str(r.developer_association),
        units: num(r.total_units),
      };
    });
    const byProv = new Map<string, { listings: number; subsidi: number[]; komersil: number[]; ppm2_subsidi: number[]; ppm2_komersil: number[] }>();
    for (const l of listings) {
      if (!l.province) continue;
      if (!byProv.has(l.province)) byProv.set(l.province, { listings: 0, subsidi: [], komersil: [], ppm2_subsidi: [], ppm2_komersil: [] });
      const g = byProv.get(l.province)!;
      g.listings++;
      if (l.price_idr !== null && (l.subsidy === 'subsidi' || l.subsidy === 'komersil')) g[l.subsidy].push(l.price_idr);
      if (l.price_per_m2_building !== null && l.subsidy === 'subsidi') g.ppm2_subsidi.push(l.price_per_m2_building);
      if (l.price_per_m2_building !== null && l.subsidy === 'komersil') g.ppm2_komersil.push(l.price_per_m2_building);
    }
    return {
      dex: ['idhousingdex'],
      status: 'built',
      asOf: null,
      golden: { 'housing/golden.json': golden },
      files: {
        'core/housing/summary.json': { as_of: 'tidak dicantumkan penyedia', ...golden },
        'core/housing/provinces.json': [...byProv.entries()]
          .sort((a, b) => b[1].listings - a[1].listings)
          .map(([p, g]) => ({ province: p, listings: g.listings, median_subsidi_idr: med(g.subsidi), median_komersil_idr: med(g.komersil), n_subsidi: g.subsidi.length, n_komersil: g.komersil.length, median_ppm2_subsidi: med(g.ppm2_subsidi), median_ppm2_komersil: med(g.ppm2_komersil) })),
        'heavy/housing/listings.json': columnar(listings, Object.keys(listings[0]!), ['subsidy', 'province', 'city', 'district', 'roof', 'wall', 'floor', 'foundation', 'developer', 'association']),
        'core/housing/quality.json': { ...golden.rules, ...golden.notes, rows_raw: raw.length, duplicates: golden.exact_duplicates_removed, price_invalid: golden.price_invalid_rows, geo_invalid: golden.geo_invalid_or_missing_rows },
      },
    };
  },
};

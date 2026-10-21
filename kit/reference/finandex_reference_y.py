#!/usr/bin/env python3
"""
Finandex — reference implementation, part 6:
CostLivingDex, InflationDex, PovertyDex, IPODex, HomelessnessDex, HousingDex (news), PopulationDex.
(c) 2026 Dea Saka Kurnia Putra. All rights reserved.
Usage:
  python3 -I finandex_reference_y.py --costliving <global_city_col_qol_index.csv> --inflation <inflation_cost_of_living_dataset.csv>
      --poverty "<MPI_193 countries_data.csv>" --ipo <ipo_tracker_2019_2026_sample.csv>
      --homelessness <folder data/> --housingnews <folder data/> --population <folder data/>
      --out <folder>
"""
import argparse, os, sys, glob
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pandas as pd
from finandex_reference import fnum, dump


def med(s):
    s = pd.Series(s).dropna()
    return fnum(s.median()) if len(s) else None


def recs(df):
    return [{k: (None if isinstance(v, float) and v != v else (fnum(v) if isinstance(v, float) else v)) for k, v in r.items()} for r in df.to_dict("records")]


def run_costliving(p, out):
    d = pd.read_csv(p)
    last = d[d.survey_date == d.survey_date.max()]
    dump(out, "costliving/golden.json", {
        "rows": int(len(d)), "cities": int(d.city.nunique()), "countries": int(d.country.nunique()),
        "survey_dates": sorted(d.survey_date.unique().tolist()), "data_source_pattern": d.data_source_pattern.value_counts().to_dict(),
        "synthetic": bool(d.data_source_pattern.str.startswith("Synthetic").all()),
        "latest_top5_cost_of_living": recs(last.nlargest(5, "cost_of_living_index")[["city", "country", "cost_of_living_index"]]),
        "latest_top5_quality_of_life": recs(last.nlargest(5, "quality_of_life_index")[["city", "country", "quality_of_life_index"]]),
        "indonesia_latest": recs(last[last.country == "Indonesia"][["city", "cost_of_living_index", "quality_of_life_index", "avg_monthly_net_salary_usd"]]),
        "notes": {"synthetic": "Every row's data_source_pattern starts with 'Synthetic-' -> the values are SYNTHETIC (pattern-based), not real survey results; label everywhere",
                  "analyst_note": "free text from the dataset author -> show as provider note"}})


def run_inflation(p, out):
    d = pd.read_csv(p)
    d["region"] = d.region.astype(str).str.strip()
    v = d.dropna(subset=["inflation_annual_pct"])
    dump(out, "inflation/golden.json", {
        "rows": int(len(d)), "rows_with_inflation": int(len(v)), "inflation_year_counts": {str(int(k)): int(c) for k, c in v.inflation_year.value_counts().items()},
        "rows_with_cost_living_index": int(d.cost_living_index.notna().sum()),
        "top5_inflation": recs(v.nlargest(5, "inflation_annual_pct")[["country", "inflation_year", "inflation_annual_pct"]]),
        "bottom5_inflation": recs(v.nsmallest(5, "inflation_annual_pct")[["country", "inflation_year", "inflation_annual_pct"]]),
        "median_inflation_latest": med(v.inflation_annual_pct),
        "indonesia": recs(d[d.country == "Indonesia"][["inflation_year", "inflation_annual_pct", "cost_living_index", "rent_monthly_usd"]]),
        "notes": {"columns": "country_code_x is always empty -> drop; use country_code_y as ISO3; region has trailing spaces -> trim",
                  "year": "inflation_year differs per country (mostly 2024) -> always show the year next to the value",
                  "xlsx": "inflation_cost_of_living_dataset.xlsx duplicates the CSV; CSV is primary"}})


def run_poverty(p, out):
    d = pd.read_csv(p)
    mpi = d[d.indicatorCode == "mpi_value"].dropna(subset=["actualValue"])
    ind = d[["indicatorCode", "indicator"]].drop_duplicates()
    dump(out, "poverty/golden.json", {
        "rows": int(len(d)), "countries": int(d.countryIsoCode.nunique()), "indicators": recs(ind),
        "mpi_countries_with_value": int(len(mpi)), "top5_mpi": recs(mpi.nlargest(5, "actualValue")[["country", "yearStr", "actualValue", "note"]]),
        "indonesia": recs(d[d.countryIsoCode == "IDN"][["indicatorCode", "yearStr", "actualValue", "note"]]),
        "notes": {"year": "each country has its own survey year (yearStr, e.g. 2022/2023) -> always show it; values not comparable as same-year",
                  "value_vs_actual": "value = rounded display, actualValue = full precision (use actualValue)"}})


def run_ipo(p, out):
    d = pd.read_csv(p)
    ver = d[d.amount_status == "verified"]
    dump(out, "ipo/golden.json", {
        "rows": int(len(d)), "first_report_range": [d.first_report_date.min(), d.first_report_date.max()],
        "countries": int(d.country.nunique()), "top6_countries": d.country.value_counts().head(6).to_dict(),
        "listing_status": d.listing_status.value_counts().to_dict(), "amount_status": d.amount_status.value_counts().to_dict(),
        "verified_total_usd": fnum(ver.issue_size_usd.sum()), "verified_median_usd": med(ver.issue_size_usd),
        "india_board_counts": d[d.country == "India"].board.value_counts().to_dict(),
        "indonesia_rows": int((d.country == "Indonesia").sum()),
        "notes": {"sample": "38% sample (5,000 of 13,316 company IPOs); REPORT.md figures are on the FULL data",
                  "status": "Announced / filed rows are not listings; use listing_status='Completed' for listed IPOs",
                  "licence": "CC BY-NC 4.0 (Fliar Research)"}})


def run_news(folder, key, sample_glob, out):
    s = pd.read_csv(glob.glob(os.path.join(folder, sample_glob))[0])
    m = pd.read_csv(os.path.join(folder, "monthly.csv"))
    c = pd.read_csv(os.path.join(folder, "countries.csv"))
    tone = s.tone.value_counts(normalize=True)
    dump(out, f"{key}/golden.json", {
        "sample_rows": int(len(s)), "sample_date_range": [s.date.min(), s.date.max()],
        "sample_tone_share": {k: fnum(v) for k, v in tone.items()},
        "monthly_rows": int(len(m)), "monthly_range": [m.month.min(), m.month.max()],
        "latest_month": recs(m.tail(1)), "peak_month_per_10k": recs(m.nlargest(1, "per_10k_news")),
        "top5_countries_2023_2026": recs(c.nlargest(5, "articles_2023_2026")[["country", "articles_2023_2026", "share_pct"]]),
        "aggregate_files": sorted(os.path.basename(x) for x in glob.glob(os.path.join(folder, "*.csv"))),
        "notes": {"what": "measures NEWS COVERAGE, not real-world counts (e.g. not the number of homeless people)",
                  "aggregates": "data/*.csv aggregates and FINDINGS.md are provider-computed on the full news index; *-news-sample.csv is a sample of article records",
                  "findings_grades": "FINDINGS.md grades A (exact count) / B (keyword rule, measured precision) / C (outlet-sensitive) -> show the grade with any finding",
                  "api_url": "api_url points to the provider API -> do not fetch; no article text is included",
                  "licence": "provider: Fliar BI (Prism News API) — licence per provider; confirm before commercial use"}})


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    for k in ["costliving", "inflation", "poverty", "ipo", "homelessness", "housingnews", "population", "out"]:
        ap.add_argument("--" + k, required=True)
    a = ap.parse_args()
    run_costliving(a.costliving, a.out); run_inflation(a.inflation, a.out); run_poverty(a.poverty, a.out); run_ipo(a.ipo, a.out)
    run_news(a.homelessness, "homelessness", "homelessness-news-sample.csv", a.out)
    run_news(a.housingnews, "housingnews", "housing-news-sample.csv", a.out)
    run_news(a.population, "population", "population-news-sample.csv", a.out)
    print("ok")

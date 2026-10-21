#!/usr/bin/env python3
"""
Finandex — reference implementation, part 3:
CryptDex, CentralBankDex, FintechDex, SalaryDex, StartupDex, IDFoodDeliveryDex, OpenCompanyDex,
PersonalFinanDex, VCNetworkDex, VCDex, IDHousingDex.
(c) 2026 Dea Saka Kurnia Putra. All rights reserved.
Usage:
  python3 -I finandex_reference_x.py --crypto-prices <folder with 19 CSV> --coingecko <crypto_daily_history.csv>
      --centralbank <central_bank_balance_sheets_global_liquidity_enriched.csv> --fintech <fintech_..._f94b9fc2.csv>
      --salary <skill_salary_percentiles_global_sample.csv> --startup <global_startup_funding_sample.csv>
      --food <indonesian_food_delivery_benchmark.csv> --companies <open_company_database_sample.csv>
      --personalfinance <personal_finance_..._f1d77e5b.csv> --vcnetwork <investor_coinvestment_network_sample.csv>
      --vcdirectory <vc_investor_directory_sample.csv> --housing <indonesia_housing_dataset.csv> --out <folder>
"""
import argparse, glob, json, os, sys, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import pandas as pd
from finandex_reference import asset_core_metrics, calendar_year_returns, corr, iso, fnum, dump, EXTREME_UP, EXTREME_DN
from finandex_reference_id import spike_mask

# World Bank aggregate codes (regions / income groups / lending groups) -> not countries
WB_AGGREGATES = set("AFE AFW ARB CEB CSS EAP EAR EAS ECA ECS EMU EUU FCS HIC HPC IBD IBT IDA IDB IDX INX LAC LCN LDC LIC LMC LMY LTE MEA MIC MNA NAC OED OSS PRE PSS PST SAS SSA SSF SST TEA TEC TLA TMN TSA TSS UMC WLD".split())


def med(s):
    s = pd.Series(s).dropna()
    return fnum(s.median()) if len(s) else None


# ----------------------------------------------------------------------------- CryptDex
def is_stablecoin(row):
    """Heuristic (dataset has no category): price within 3% of $1 AND symbol/name mentions USD/Dollar/Stable (or dai/gho) AND not a fund."""
    s, n, p = str(row.symbol).lower(), str(row["name"]).lower(), row.current_price_usd
    if not (0.97 <= p <= 1.03) or "fund" in n:
        return False
    return ("usd" in s or "usd" in n or "dollar" in n or "stable" in n or s in {"dai", "gho"})


def run_crypto(a, out):
    metrics, quality = {}, {}
    for f in sorted(glob.glob(os.path.join(a.crypto_prices, "*.csv"))):
        g = pd.read_csv(f).sort_values("date")
        t = os.path.basename(f)[:-4]  # asset id = file stem (TON.csv holds TON until 2026-06-15, then ticker GRAM)
        g["date"] = pd.to_datetime(g["date"])
        m_sp = spike_mask(g.close.values).values
        gg = g[~m_sp]
        d, c = gg.date.values, gg.close.values.astype(float)
        m = asset_core_metrics(d, c, 365)
        m["ticker"] = t
        m["ticker_history"] = [{"ticker": k, "from": iso(v.min()), "to": iso(v.max())} for k, v in g.groupby("ticker", sort=False).date]
        r = c[1:] / c[:-1] - 1
        quality[t] = {"spikes_removed": [iso(x) for x in g.date.values[m_sp]],
                      "extreme_moves": [{"date": iso(x), "ret": fnum(v)} for x, v in zip(d[1:], r) if v >= EXTREME_UP or v <= EXTREME_DN],
                      "zero_volume_rows": int((gg.volume == 0).sum()), "stale": iso(d[-1]) != "2026-10-19"}
        metrics[t] = m
    cg = pd.read_csv(a.coingecko)
    cg["stablecoin_heuristic"] = cg.apply(is_stablecoin, axis=1)
    tot = float(cg.market_cap_usd.sum())
    st = cg[cg.stablecoin_heuristic]
    top100 = cg[cg.market_cap_rank <= 100]
    snap = {"snapshot_date": cg.date.iloc[0], "coins": int(len(cg)), "total_market_cap_top250_usd": fnum(tot),
            "btc_dominance_top250": fnum(cg[cg.symbol == "btc"].market_cap_usd.iloc[0] / tot),
            "eth_dominance_top250": fnum(cg[cg.symbol == "eth"].market_cap_usd.iloc[0] / tot),
            "stablecoins_heuristic": sorted(st.symbol.tolist()), "stablecoin_market_cap_usd": fnum(st.market_cap_usd.sum()),
            "stablecoin_share_top250": fnum(st.market_cap_usd.sum() / tot),
            "top10_by_market_cap": cg.nsmallest(10, "market_cap_rank")[["market_cap_rank", "symbol", "name", "current_price_usd", "market_cap_usd"]].to_dict("records"),
            "top5_7d_gainers_top100": top100.nlargest(5, "price_change_pct_7d")[["symbol", "name", "price_change_pct_7d"]].to_dict("records"),
            "top5_7d_losers_top100": top100.nsmallest(5, "price_change_pct_7d")[["symbol", "name", "price_change_pct_7d"]].to_dict("records"),
            "median_ath_change_pct_top100": fnum(top100.ath_change_pct.median()),
            "notes": {"pct_fields": "price_change_pct_* and ath_change_pct are already in PERCENT units (e.g. 0.86634 = 0.87%)",
                      "max_supply_null": "null = no fixed max supply (or not reported)"}}
    dump(out, "crypto/golden_metrics.json", metrics)
    dump(out, "crypto/golden_snapshot.json", snap)
    dump(out, "crypto/quality_report.json", {"tickers": quality,
                                             "notes": {"TON_GRAM": "TON.csv changes ticker from TON to GRAM on 2026-06-16 with a continuous price (close 2026-06-15 = open 2026-06-16); treat as ONE asset with ticker_history, display 'TON -> GRAM'.",
                                                       "defi": "DeFi notebook references 7 DefiLlama CSVs that were NOT supplied; DeFi module is 'pending data'."}})


# ----------------------------------------------------------------------------- CentralBankDex
def run_cb(a, out):
    df = pd.read_csv(a.centralbank)
    us = df[df.entity_type == "Central_Bank_System"].sort_values("observation_date")
    cy = df[df.entity_type == "Country_Jurisdiction"].copy()
    cy["is_aggregate"] = cy.country_iso3.isin(WB_AGGREGATES)

    def last_valid(col):
        s = us[["observation_date", col]].dropna()
        return {"date": s.observation_date.iloc[-1], "value": fnum(s[col].iloc[-1])} if len(s) else None

    fed = us[["observation_date", "fed_total_assets_mil_usd"]].dropna()
    imax = fed.fed_total_assets_mil_usd.idxmax()
    latest_year = int(cy.year.max())
    ly = cy[(cy.year == latest_year) & (~cy.is_aggregate)]
    bm = ly[["entity_name", "country_iso3", "broad_money_growth_annual_pct"]].dropna()
    idn = cy[cy.country_iso3 == "IDN"].sort_values("year")
    idn_last = idn.dropna(subset=["broad_money_growth_annual_pct"]).tail(1)
    us_cols = ["fed_total_assets_mil_usd", "ecb_total_assets_mil_eur", "boj_total_assets_100mil_jpy", "g3_combined_assets_tril_usd",
               "us_m2_money_supply_bil_usd", "policy_rate_pct", "treasury_10y_yield_pct", "yield_curve_spread_10y_2y_pct",
               "cpi_index_value", "cpi_inflation_rate_yoy_pct"]
    dump(out, "centralbank/golden.json", {
        "rows": int(len(df)), "rows_us_system": int(len(us)), "rows_country": int(len(cy)),
        "us_date_range": [us.observation_date.min(), us.observation_date.max()],
        "country_year_range": [int(cy.year.min()), int(cy.year.max())],
        "country_entities": int(cy[~cy.is_aggregate].country_iso3.nunique()), "aggregate_entities": int(cy[cy.is_aggregate].country_iso3.nunique()),
        "us_latest": {c: last_valid(c) for c in us_cols},
        "fed_assets_first_date": fed.observation_date.min(),
        "fed_assets_peak": {"date": fed.observation_date[imax], "value_mil_usd": fnum(fed.fed_total_assets_mil_usd[imax])},
        "latest_country_year": latest_year,
        "broad_money_growth_top5_latest_year": bm.nlargest(5, "broad_money_growth_annual_pct").to_dict("records"),
        "indonesia_latest_broad_money_growth": idn_last[["year", "broad_money_growth_annual_pct", "broad_money_pct_gdp"]].to_dict("records"),
        "notes": {"units": "fed_total_assets_mil_usd = USD million; ecb_total_assets_mil_eur = EUR million; boj_total_assets_100mil_jpy = JPY 100 million; g3_combined_assets_tril_usd = USD trillion; us_m2_money_supply_bil_usd = USD billion",
                  "frequency": "US/G10 rows are daily (FRED, values carried between releases); country rows are annual (World Bank, dated YYYY-12-31)",
                  "enriched_columns": "monetary_policy_regime, yield_curve_regime, macro_financial_stress_tier, global_liquidity_expansion_index, real_policy_rate_spread, evidence_span, cot_rationale, confidence_score are labels/text generated by the dataset author -> show as 'label penyedia dataset', never as official data; do not display cot_rationale",
                  "aggregates": "World Bank aggregate codes (e.g. WLD, EAS, IDA) are regions/groups, not countries"}})


# ----------------------------------------------------------------------------- FintechDex
def run_fintech(a, out):
    df = pd.read_csv(a.fintech, low_memory=False)
    df["published_date"] = df.published_at.astype(str).str[:10]
    sent = df.sentiment_label.value_counts().to_dict()
    by_pf = df.groupby("platform").sentiment_label.value_counts(normalize=True).unstack().fillna(0).round(6)
    prod = df["product_mentioned"].dropna().astype(str)
    prod = prod[~prod.isin(["", "[]", "None", "nan"])]
    dump(out, "fintech/golden.json", {
        "rows": int(len(df)), "columns": int(df.shape[1]), "platforms": df.platform.value_counts().to_dict(),
        "published_range": [df.published_date.min(), df.published_date.max()],
        "sentiment_counts": sent, "sentiment_share": {k: fnum(v / len(df)) for k, v in sent.items()},
        "sentiment_share_by_platform": {p: {k: fnum(v) for k, v in r.items()} for p, r in by_pf.iterrows()},
        "languages": df.language_detected.value_counts().to_dict(),
        "rows_with_product_mentioned": int(len(prod)),
        "privacy_rule": "Drop author, author_followers, mentions and any user handle before processing; never display them.",
        "notes": {"snapshot": "collected/updated 2026-09-08 (file name and last_updated)", "duplicates": "JSON file holds the same 3,946 records; CSV is primary"}})


def run_social(path, out, key, snapshot):
    df = pd.read_csv(path, low_memory=False)
    pub = df.published_at.astype(str).str[:10]
    sent = df.sentiment_label.value_counts().to_dict()
    by_pf = df.groupby("platform").sentiment_label.value_counts(normalize=True).unstack().fillna(0)
    dump(out, f"{key}/golden.json", {
        "rows": int(len(df)), "columns": int(df.shape[1]), "platforms": df.platform.value_counts().to_dict(),
        "published_range": [pub.min(), pub.max()], "sentiment_counts": sent,
        "sentiment_share": {k: fnum(v / len(df)) for k, v in sent.items()},
        "sentiment_share_by_platform": {p: {k: fnum(v) for k, v in r.items()} for p, r in by_pf.iterrows()},
        "languages": df.language_detected.value_counts().to_dict(),
        "privacy_rule": "Drop author, author_followers, mentions and any user handle before processing; never display them.",
        "notes": {"snapshot": snapshot, "duplicates": "JSON/JSONL/Parquet copies hold the same records; CSV is primary"}})


def run_vcnet(path, out):
    df = pd.read_csv(path)
    inv = pd.concat([df.investor_a, df.investor_b])
    deg = inv.value_counts()
    w = pd.concat([df[["investor_a", "shared_deals"]].rename(columns={"investor_a": "i"}), df[["investor_b", "shared_deals"]].rename(columns={"investor_b": "i"})]).groupby("i").shared_deals.sum()
    top = df.nlargest(10, "shared_deals")[["investor_a", "investor_b", "shared_deals", "first_year", "last_year", "top_shared_sector", "top_shared_country"]]
    dump(out, "vcnetwork/golden.json", {
        "rows": int(len(df)), "unique_investors": int(inv.nunique()), "year_range": [int(df.first_year.min()), int(df.last_year.max())],
        "top10_pairs_by_shared_deals": top.to_dict("records"),
        "top10_investors_by_partners_in_sample": {k: int(v) for k, v in deg.head(10).items()},
        "top10_investors_by_weighted_degree": {k: int(v) for k, v in w.nlargest(10).items()},
        "pairs_shared_deals_1_share": fnum((df.shared_deals == 1).mean()),
        "top5_shared_sectors": df.top_shared_sector.value_counts().head(5).to_dict(),
        "top5_shared_countries": df.top_shared_country.value_counts().head(5).to_dict(),
        "investor_type_pairs_top5": (df.investor_a_type.astype(str) + " + " + df.investor_b_type.astype(str)).value_counts().head(5).to_dict(),
        "notes": {"sample": "25% sample (75,855 of 303,421 pairs) chosen by pair hash -> partner counts are sample counts, not full-network degrees",
                  "licence": "CC BY-NC 4.0 (Fliar Research) — non-commercial only"}})


def run_vcdir(path, out):
    df = pd.read_csv(path)
    dump(out, "vcdirectory/golden.json", {
        "rows": int(len(df)), "countries": int(df.hq_country.nunique()),
        "top10_hq_countries": df.hq_country.value_counts().head(10).to_dict(),
        "investor_types": df.investor_type.value_counts().to_dict(),
        "top10_by_deals": df.nlargest(10, "deals")[["investor_name", "investor_type", "hq_country", "deals", "lead_deals"]].to_dict("records"),
        "median_deals": med(df.deals), "median_round_usd_median": med(df.median_round_usd),
        "active_2025_2026_share": fnum((df.deals_2025_2026 > 0).mean()),
        "indonesia_hq_investors": int((df.hq_country == "Indonesia").sum()),
        "notes": {"sample": "25% sample (8,827 of 35,310 investors); REPORT.md figures are on the FULL data",
                  "licence": "CC BY-NC 4.0 (Fliar Research) — non-commercial only"}})


# ----------------------------------------------------------------------------- IDHousingDex
HOUSING_PRICE_MIN, HOUSING_PRICE_MAX = 50_000_000, 100_000_000_000          # valid listing price band (IDR)
ID_LAT, ID_LON = (-11.5, 6.5), (94.0, 141.5)                                 # Indonesia bounding box


def run_housing(path, out):
    raw = pd.read_csv(path, low_memory=False)
    n_raw = len(raw)
    df = raw.drop_duplicates().copy()
    n_dup = n_raw - len(df)
    df["price_valid"] = df.price_idr.between(HOUSING_PRICE_MIN, HOUSING_PRICE_MAX)
    geo_ok = df.latitude.between(*ID_LAT) & df.longitude.between(*ID_LON)
    v = df[df.price_valid]
    v_bld = v[v.building_area_m2 > 0]
    ppm2 = v_bld.price_idr / v_bld.building_area_m2
    prov = v.groupby(["province", "subsidy_status"]).price_idr.median().unstack()
    dump(out, "housing/golden.json", {
        "rows_raw": int(n_raw), "exact_duplicates_removed": int(n_dup), "rows": int(len(df)),
        "price_invalid_rows": int((~df.price_valid).sum()), "geo_invalid_or_missing_rows": int((~geo_ok).sum()),
        "provinces": int(df.province.nunique()), "city_regency": int(df.city_regency.nunique()),
        "projects": int(df.housing_name.nunique()), "developers": int(df.developer_name.nunique()),
        "subsidy_counts": df.subsidy_status.value_counts().to_dict(),
        "median_price_by_subsidy_idr": {k: med(g.price_idr) for k, g in v.groupby("subsidy_status")},
        "median_price_per_m2_building_by_subsidy_idr": {k: med(ppm2[v_bld.subsidy_status == k]) for k in ["subsidi", "komersil"]},
        "top10_provinces_by_listings": df.province.value_counts().head(10).to_dict(),
        "median_subsidi_price_by_province_top10_listings": {k: fnum(prov.loc[k, "subsidi"]) if "subsidi" in prov and k in prov.index and prov.loc[k, "subsidi"] == prov.loc[k, "subsidi"] else None
                                                            for k in df.province.value_counts().head(10).index},
        "developer_association_share": {k: fnum(c / len(df)) for k, c in df.developer_association.value_counts().head(8).items()},
        "median_building_area_m2_subsidi": med(v[v.subsidy_status == "subsidi"].building_area_m2),
        "median_land_area_m2_subsidi": med(v[v.subsidy_status == "subsidi"].land_area_m2),
        "bedrooms_mode_subsidi": int(v[v.subsidy_status == "subsidi"].bedrooms.mode().iloc[0]),
        "rules": {"dedup": "drop exact duplicate rows", "price_valid": f"{HOUSING_PRICE_MIN} <= price_idr <= {HOUSING_PRICE_MAX}",
                  "geo": "lat in [-11.5, 6.5] and lon in [94, 141.5]; otherwise not plotted", "bedrooms_0": "0 = not reported",
                  "price_per_m2": "recompute from price_idr / area (area > 0); dataset columns are kept only for cross-check"},
        "notes": {"csv_multiline": "CSV has quoted multi-line fields: wc -l (134,185) != rows; always use a real CSV parser",
                  "property_type": "single value 'Rumah Tapak'", "subsidy_status": "'subsidi' or 'komersil' (as written in the data)"}})


# ----------------------------------------------------------------------------- SalaryDex
def run_salary(a, out):
    df = pd.read_csv(a.salary)
    sw = df[df.role_family == "software-eng"]
    sk = df.skills.dropna().str.split("|").explode().str.strip()
    sk_counts = sk.value_counts()
    top_sk = sk_counts.head(10).index.tolist()
    exp = df.dropna(subset=["skills"]).assign(skill=df.skills.dropna().str.split("|")).explode("skill")
    exp["skill"] = exp.skill.str.strip()
    dump(out, "salary/golden.json", {
        "rows": int(len(df)), "posted_month_range": [df.posted_month.min(), df.posted_month.max()],
        "countries": int(df.country.nunique()), "role_families": int(df.role_family.nunique()),
        "median_salary_mid_usd_all": med(df.salary_mid_usd),
        "median_salary_mid_usd_by_country_top10": {c: med(df[df.country == c].salary_mid_usd) for c in df.country.value_counts().head(10).index},
        "count_by_country_top10": df.country.value_counts().head(10).to_dict(),
        "median_salary_mid_usd_by_role_family": {r: med(g.salary_mid_usd) for r, g in df.groupby("role_family")},
        "software_eng_median_usd": {c: med(sw[sw.country == c].salary_mid_usd) for c in ["US", "CA", "IN", "GB", "DE", "FR"]},
        "top10_skills_by_postings": {s: int(sk_counts[s]) for s in top_sk},
        "median_by_top10_skill_usd": {s: med(exp[exp.skill == s].salary_mid_usd) for s in top_sk},
        "notes": {"sample": "16% sample (100,060 of 620,752 postings); REPORT.md figures are computed on the FULL data and will differ",
                  "fx": "salary_*_usd use the dataset's fixed exchange-rate table (approx. 2025 averages); not PPP",
                  "licence": "CC BY-NC 4.0 (Fliar Research) — non-commercial only"}})


# ----------------------------------------------------------------------------- StartupDex
def run_startup(a, out):
    df = pd.read_csv(a.startup)
    dis = df[df.amount_usd.notna()]
    mega = dis[dis.amount_usd >= 100_000_000]
    dump(out, "startup/golden.json", {
        "rows": int(len(df)), "announced_range": [df.announced_date.min(), df.announced_date.max()],
        "companies": int(df.company_domain.nunique()), "rounds_with_amount": int(len(dis)),
        "total_disclosed_usd": fnum(dis.amount_usd.sum()),
        "rounds_by_year": {str(k): int(v) for k, v in df.year.value_counts().sort_index().items()},
        "disclosed_usd_by_year": {str(k): fnum(v) for k, v in dis.groupby("year").amount_usd.sum().items()},
        "median_amount_by_stage_usd": {s: med(g.amount_usd) for s, g in dis.groupby("stage")},
        "top5_countries_by_disclosed_usd": {k: fnum(v) for k, v in dis.groupby("country").amount_usd.sum().nlargest(5).items()},
        "top5_sectors_by_rounds": df.sector.value_counts().head(5).to_dict(),
        "mega_round_share_of_rounds": fnum(len(mega) / len(dis)), "mega_round_share_of_dollars": fnum(mega.amount_usd.sum() / dis.amount_usd.sum()),
        "amount_status_counts": df.amount_status.value_counts().to_dict(),
        "indonesia_rounds": int((df.country == "Indonesia").sum()),
        "notes": {"sample": "25% sample (20,227 of 80,911 rounds); REPORT.md figures are on the FULL data",
                  "amount_status": "use verified amounts by default; show unchecked/failed_check separately",
                  "licence": "CC BY-NC 4.0 (Fliar Research) — non-commercial only; news_excerpt = short quotes, always show news_source/news_url"}})


# ----------------------------------------------------------------------------- IDFoodDeliveryDex
def run_food(a, out):
    df = pd.read_csv(a.food)
    chk = ((df.online_price_idr / df.estimated_dine_in_price_idr - 1) * 100 - df.markup_percentage).abs()
    dump(out, "food/golden.json", {
        "rows": int(len(df)), "merchants": int(df.merchant_name.nunique()), "cities": df.merchant_city.value_counts().to_dict(),
        "cuisines": df.cuisine_category.value_counts().to_dict(), "cloud_kitchen_items": int(df.is_cloud_kitchen.sum()),
        "median_markup_pct": med(df.markup_percentage), "mean_markup_pct": fnum(df.markup_percentage.mean()),
        "median_markup_by_city": {k: med(g.markup_percentage) for k, g in df.groupby("merchant_city")},
        "median_markup_by_cuisine": {k: med(g.markup_percentage) for k, g in df.groupby("cuisine_category")},
        "median_markup_cloud_vs_not": {str(k): med(g.markup_percentage) for k, g in df.groupby("is_cloud_kitchen")},
        "median_online_price_idr": med(df.online_price_idr), "median_packaging_fee_idr": med(df.packaging_fee_idr),
        "median_promo_discount_pct": med(df.promo_discount_pct), "markup_formula_max_abs_diff_pp": fnum(chk.max()),
        "notes": {"estimates": "estimated_dine_in_price_idr is an ESTIMATE from the dataset author; tiers/bias/burden columns, evidence_span, cot_rationale, confidence_score are author-generated labels",
                  "parquet": "indonesian_food_delivery_benchmark.parquet duplicates the CSV; CSV is primary"}})


# ----------------------------------------------------------------------------- OpenCompanyDex
def run_companies(a, out):
    df = pd.read_csv(a.companies)
    known = df.country.notna()
    dump(out, "opencompany/golden.json", {
        "rows": int(len(df)), "with_country": int(known.sum()), "countries": int(df.country.nunique()),
        "top10_countries": df.country.value_counts().head(10).to_dict(),
        "share_us_of_known_country": fnum((df.country == "United States").sum() / known.sum()),
        "status_counts": df.status.value_counts().to_dict(), "funded_share": fnum(df.is_funded.astype(bool).mean()),
        "median_founded_year": med(df.founded_year), "share_founded_2015_plus_of_dated": fnum((df.founded_year >= 2015).sum() / df.founded_year.notna().sum()),
        "top10_sectors": df.sector.value_counts().head(10).to_dict(),
        "indonesia_companies": int((df.country == "Indonesia").sum()),
        "notes": {"sample": "2% sample (100,000 of 4,863,273 companies); REPORT.md figures are on the FULL data",
                  "licence": "CC BY-NC 4.0 (Fliar Research) — non-commercial only",
                  "links": "fliar_profile_url carries UTM parameters; show as an attribution link, never auto-fetch"}})


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    for k in ["crypto-prices", "coingecko", "centralbank", "fintech", "salary", "startup", "food", "companies", "personalfinance", "vcnetwork", "vcdirectory", "housing", "out"]:
        ap.add_argument("--" + k, required=True)
    a = ap.parse_args()
    run_crypto(a, a.out); run_cb(a, a.out); run_salary(a, a.out)
    run_social(a.fintech, a.out, "fintech", "collected/updated 2026-09-08 (file name)")
    run_startup(a, a.out); run_food(a, a.out); run_companies(a, a.out)
    run_social(a.personalfinance, a.out, "personalfinance", "collected/updated 2026-09-16 (file name)")
    run_vcnet(a.vcnetwork, a.out); run_vcdir(a.vcdirectory, a.out)
    run_housing(a.housing, a.out)
    print("ok")

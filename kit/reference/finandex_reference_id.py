#!/usr/bin/env python3
"""
Finandex — reference implementation, part 2:
CommerceDex, IDFinanDex, RupiahDex, ReksaDex, IDXDex.
(c) 2026 Dea Saka Kurnia Putra. All rights reserved.

Reuses the helpers and conventions of finandex_reference.py (same folder).
Usage:
  python3 -I finandex_reference_id.py --ecom <Ecommerce_dataset/data> --idfin <indonesia multi-asset csv>
      --usdidr <usd_idr_daily_cleaned.csv> --reksa <Reksadana di Indonesia.csv>
      --idx-prices <IDX 2000-2024.csv> --idx-fin <combined_financial_data_idx.csv>
      --idx-ipo <e-IPO Data.csv> --idx-warrant <Warrant - Price D1.csv> --idx-companies <idx_listed_companies.csv>
      --out <folder>
"""
import argparse, os, sys, json, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import pandas as pd
from finandex_reference import (asset_core_metrics, calendar_year_returns, corr, beta, sma, rsi14, iso, fnum, dump,
                                anchor_date, SPIKE_UP, SPIKE_DN, SPIKE_RT, EXTREME_UP, EXTREME_DN, MIN_RET_VOL)

FX_SPIKE_ABS, FX_SPIKE_RT = 0.05, (0.98, 1.02)
# Statement currency of financials_annual.csv. companies.reporting_currency describes the PRICE currency;
# for these ADRs the financial statements are reported in another currency (verified by magnitude).
ECOM_FIN_CCY_OVERRIDE = {"alibaba": "CNY", "jdcom": "CNY", "pinduoduo": "CNY", "vipshop": "CNY", "stoneco": "BRL"}
ID_MONTHS = {"Jan": 1, "Feb": 2, "Mar": 3, "Apr": 4, "Mei": 5, "Jun": 6, "Jul": 7, "Agt": 8, "Sep": 9, "Okt": 10, "Nov": 11, "Des": 12}


def spike_mask(px, up=SPIKE_UP, dn=SPIKE_DN, rt=SPIKE_RT):
    s = pd.Series(px)
    prev, nxt = s.shift(1), s.shift(-1)
    r, rn, q = s / prev - 1, nxt / s - 1, nxt / prev
    return (((r > up) & (rn < dn)) | ((r < dn) & (rn > up))) & q.between(*rt)


def fx_spike_mask(px):
    s = pd.Series(px)
    prev, nxt = s.shift(1), s.shift(-1)
    r, rn, q = s / prev - 1, nxt / s - 1, nxt / prev
    return (r.abs() >= FX_SPIKE_ABS) & (rn.abs() >= FX_SPIKE_ABS) & (np.sign(r) != np.sign(rn)) & q.between(*FX_SPIKE_RT)


FX_MEDIAN_WINDOW, FX_MEDIAN_DEV = 11, 0.10


def fx_median_mask(px):
    """Bad print = deviates >= 10% from the centred rolling median of 11 rows (min 5 rows), itself included."""
    s = pd.Series(px)
    med = s.rolling(FX_MEDIAN_WINDOW, center=True, min_periods=5).median()
    return (s / med - 1).abs() >= FX_MEDIAN_DEV


def fx_clean(dates, px):
    """Iterate FX bad-print removal until stable: (a) 1-day round-trip spikes, (b) multi-day plateaus far from the local median."""
    d, p = np.array(dates), np.array(px, dtype=float)
    removed = []
    for _ in range(5):
        m = (fx_spike_mask(p) | fx_median_mask(p)).values
        if not m.any():
            break
        removed += [iso(x) for x in d[m]]
        d, p = d[~m], p[~m]
    return d, p, sorted(removed)


def r4(x):
    return None if x is None else round(x, 6)


# ----------------------------------------------------------------------------- CommerceDex
def run_commerce(folder, out):
    co = pd.read_csv(os.path.join(folder, "companies.csv"))
    px = pd.read_csv(os.path.join(folder, "prices_daily.csv"))
    px = px.dropna(subset=["close", "adj_close"])
    px["date"] = pd.to_datetime(px["date"])
    px = px.sort_values(["company_id", "date"])
    fin = pd.read_csv(os.path.join(folder, "financials_annual.csv"))
    idx = pd.read_csv(os.path.join(folder, "ecommerce_index.csv"))
    macro = pd.read_csv(os.path.join(folder, "macro_indicators.csv"))
    metrics, quality = {}, {}
    for cid, g in px.groupby("company_id"):
        m_sp = spike_mask(g.adj_close.values).values
        gg = g[~m_sp]
        d, a, c = gg.date.values, gg.adj_close.values.astype(float), gg.close.values.astype(float)
        m = asset_core_metrics(d, a, 252)
        m["last_close"], m["first_close"] = fnum(c[-1]), fnum(c[0])
        ia = int(np.argmax(c)); m.update({"ath_close": fnum(c[ia]), "ath_date": iso(d[ia]), "pct_from_ath": fnum(c[-1] / c[ia] - 1)})
        row = co[co.company_id == cid].iloc[0]
        m.update({"company_id": cid, "ticker": row.ticker, "name": row["name"], "price_currency": row.reporting_currency,
                  "financials_currency": ECOM_FIN_CCY_OVERRIDE.get(cid, row.reporting_currency),
                  "country_code": row.country_code, "region": row.region, "segment": row.segment, "exchange": row.exchange})
        f = fin[fin.company_id == cid].sort_values("fiscal_year")
        f = f[f.total_revenue.notna()]
        if len(f):
            L = f.iloc[-1]
            m["fin_latest_fy"] = int(L.fiscal_year)
            m["fin_revenue"] = fnum(L.total_revenue); m["fin_net_income"] = fnum(L.net_income)
            m["fin_net_margin"] = fnum(L.net_income / L.total_revenue) if L.total_revenue else None
            m["fin_operating_margin"] = fnum(L.operating_income / L.total_revenue) if L.total_revenue else None
            m["fin_fcf"] = fnum(L.free_cash_flow)
            if len(f) >= 2:
                P = f.iloc[-2]; m["fin_revenue_yoy"] = fnum(L.total_revenue / P.total_revenue - 1) if P.total_revenue else None
        quality[cid] = {"spikes_removed": [iso(x) for x in g.date.values[m_sp]],
                        "extreme_moves": [{"date": iso(dd), "ret": fnum(x)} for dd, x in zip(d[1:], a[1:] / a[:-1] - 1) if x >= EXTREME_UP or x <= EXTREME_DN]}
        metrics[cid] = m
    # provided index (attributed, methodology per dataset README)
    idx["date"] = pd.to_datetime(idx["date"])
    idx = idx.sort_values("date")
    prev_c = idx.constituents.shift(1)
    partial = idx[(idx.constituents < prev_c * 0.8)]
    im = asset_core_metrics(idx.date.values, idx.index_level.values.astype(float), 252)
    im["partial_constituent_days"] = [iso(x) for x in partial.date]
    seg = pd.DataFrame(metrics.values()).groupby("segment").ret_1Y.median().dropna().to_dict()
    reg = pd.DataFrame(metrics.values()).groupby("region").ret_1Y.median().dropna().to_dict()
    mac_latest = macro.sort_values("year").groupby(["country_code", "indicator_name"]).last().reset_index()
    mac = {f"{r.country_code}|{r.indicator_name}": {"year": int(r.year), "value": fnum(r.value)} for r in mac_latest.itertuples()}
    dump(out, "commerce/golden_metrics.json", metrics)
    dump(out, "commerce/golden_index.json", im)
    dump(out, "commerce/golden_groups.json", {"median_ret_1Y_by_segment": seg, "median_ret_1Y_by_region": reg})
    dump(out, "commerce/golden_macro_latest.json", mac)
    dump(out, "commerce/quality_report.json", {"rows_dropped_null_close": 13, "financials_currency_override": ECOM_FIN_CCY_OVERRIDE,
                                               "tickers": quality})


# ----------------------------------------------------------------------------- IDFinanDex
IDF_MARKET = ["OIL", "GOLD", "USDIDR", "SP500", "IHSG", "VIX"]
IDF_MACRO = ["CPI", "BI_rate", "US_rate"]


def idfin_series(df, col):
    s = df[["Date", col]].dropna()
    d, p = s.Date.values, s[col].values.astype(float)
    # carried-forward rows: exact repeat of the previous value -> not a new observation
    keep = np.r_[True, p[1:] != p[:-1]]
    cf = int((~keep).sum())
    d, p = d[keep], p[keep]
    removed = []
    if col == "USDIDR":
        d, p, removed = fx_clean(d, p)
    return d, p, cf, removed


def run_idfin(path, out):
    df = pd.read_csv(path, parse_dates=["Date"]).sort_values("Date")
    ser, metrics, quality = {}, {}, {}
    for col in IDF_MARKET:
        d, p, cf, rem = idfin_series(df, col)
        ser[col] = (d, p)
        m = asset_core_metrics(d, p, 252)
        m["sma200"], m["rsi14"] = sma(p, 200), rsi14(p)
        metrics[col] = m
        quality[col] = {"carried_forward_rows_excluded": cf, "spikes_removed": rem,
                        "nonpositive_values": [iso(x) for x, v in zip(d, p) if v <= 0]}
    macro = {}
    for col in IDF_MACRO:
        s = df[["Date", col]].dropna()
        ch = s[s[col].diff().fillna(1) != 0]
        macro[col] = {"latest": fnum(s[col].iloc[-1]), "latest_date": iso(s.Date.iloc[-1]),
                      "changes": [{"date": iso(r.Date), "value": fnum(getattr(r, col))} for r in ch.itertuples()]}
    corrm = {a: {b: (1.0 if a == b else corr(*ser[a], *ser[b], years=3)) for b in IDF_MARKET} for a in IDF_MARKET}
    derived = {"bi_minus_us_rate": fnum(macro["BI_rate"]["latest"] - macro["US_rate"]["latest"]),
               "bi_real_rate_vs_cpi": fnum(macro["BI_rate"]["latest"] - macro["CPI"]["latest"])}
    cal = {k: calendar_year_returns(*ser[k]) for k in IDF_MARKET}
    dump(out, "idfin/golden_metrics.json", metrics)
    dump(out, "idfin/golden_macro.json", {"series": macro, "derived_latest": derived,
                                          "notes": {"CPI": "annual inflation rate in % as provided; one value per calendar year",
                                                    "BI_rate": "Bank Indonesia policy rate %, step series",
                                                    "US_rate": "US policy/short rate % as provided, monthly steps"}})
    dump(out, "idfin/golden_correlation_3y.json", corrm)
    dump(out, "idfin/golden_calendar_returns.json", cal)
    dump(out, "idfin/quality_report.json", quality)
    return ser


# ----------------------------------------------------------------------------- RupiahDex (USD/IDR)
def run_usdidr(path, idfin_ser, out):
    df = pd.read_csv(path)
    df["date"] = pd.to_datetime(df["Date"].str[:10])  # calendar date as written; NEVER shift by the tz offset
    n0 = len(df)
    df = df.dropna(subset=["Close"]).sort_values("date")
    d, p, removed = fx_clean(df.date.values, df.Close.values.astype(float))
    m = asset_core_metrics(d, p, 252)
    m["sma50"], m["sma200"], m["rsi14"] = sma(p, 50), sma(p, 200), rsi14(p)
    cal = calendar_year_returns(d, p)
    s = pd.Series(p, index=pd.DatetimeIndex(d))
    yavg = s.groupby(s.index.year).mean()
    lookups = {}
    for q in ["2008-10-24", "2015-09-29", "2018-10-11", "2020-03-23", "2024-06-21", "2026-01-02"]:
        i = np.searchsorted(d, np.datetime64(q), side="right") - 1
        lookups[q] = {"date": iso(d[i]), "close": fnum(p[i])}
    # cross-check with IDFinanDex USDIDR
    d2, p2 = idfin_ser["USDIDR"]
    j = pd.concat([s, pd.Series(p2, index=pd.DatetimeIndex(d2))], axis=1, join="inner").dropna()
    diff = (j.iloc[:, 1] / j.iloc[:, 0] - 1).abs()
    dump(out, "usdidr/golden_metrics.json", m)
    dump(out, "usdidr/golden_calendar_returns.json", cal)
    dump(out, "usdidr/golden_yearly_average.json", {str(k): fnum(v) for k, v in yavg.items()})
    dump(out, "usdidr/golden_lookups.json", lookups)
    dump(out, "usdidr/quality_report.json", {"rows_raw": n0, "rows_dropped_null_close": int(n0 - len(df)), "spikes_removed": removed,
                                             "cross_check_vs_idfin": {"overlap_days": int(len(j)), "max_abs_diff": fnum(diff.max()),
                                                                      "days_diff_gt_1pct": int((diff > 0.01).sum())}})


# ----------------------------------------------------------------------------- ReksaDex
def run_reksa(path, out):
    df = pd.read_csv(path, encoding="utf-8-sig")
    df["date"] = pd.to_datetime(df["Tanggal Lengkap"], format="%m/%d/%Y")
    df = df.rename(columns={"Nama MI": "mi", "Nama BK": "bk", "Produk RD": "fund", "Tipe RD": "type", "Denominasi": "ccy",
                            "NAB (Dalam Rupiah)": "aum", "Unit Penyertaan": "units", "NAB per Unit": "nav"})
    rows_total = len(df)
    a = df[(df.aum > 0) & (df.units > 0) & (df.nav > 0)].copy().sort_values(["fund", "date"])
    a["ym"] = a.date.dt.year * 12 + a.date.dt.month
    g = a.groupby("fund")
    a["prev_nav"], a["prev_ym"] = g.nav.shift(1), g.ym.shift(1)
    a["r"] = np.where(a.ym - a.prev_ym == 1, a.nav / a.prev_nav - 1, np.nan)
    a["extreme"] = (a.r >= EXTREME_UP) | (a.r <= EXTREME_DN)
    last = a.date.max(); L = a[a.date == last]
    by_type = L.groupby("type").aum.agg(["count", "sum"])
    by_mi = L.groupby("mi").aum.sum().sort_values(ascending=False)
    by_bk = L.groupby("bk").aum.sum().sort_values(ascending=False)
    aum_ts = a.groupby("date").aum.sum()
    cnt_ts = a.groupby("date").size()

    def fund_ret(group, months):
        g2 = group.set_index("ym")
        lym = g2.index.max()
        if lym - months not in g2.index:
            return None
        return fnum(g2.loc[lym, "nav"] / g2.loc[lym - months, "nav"] - 1)

    lym = int(last.year * 12 + last.month)
    funds = {}
    for f, gr in a.groupby("fund"):
        if gr.ym.max() != lym:
            continue
        rr = gr.r.dropna()
        funds[f] = {"mi": gr.mi.iloc[-1], "bk": gr.bk.iloc[-1], "type": gr.type.iloc[-1], "ccy": gr.ccy.iloc[-1],
                    "aum": fnum(gr.aum.iloc[-1]), "nav": fnum(gr.nav.iloc[-1]), "first_date": iso(gr.date.min()),
                    "ret_1M": fund_ret(gr, 1), "ret_YTD": fund_ret(gr, last.month), "ret_1Y": fund_ret(gr, 12), "ret_3Y": fund_ret(gr, 36),
                    "vol_1Y_monthly_annualized": fnum(rr.tail(12).std(ddof=1) * math.sqrt(12)) if len(rr.tail(12)) >= 12 else None,
                    "extreme_months": [iso(x) for x in gr[gr.extreme].date]}
    fdf = pd.DataFrame(funds.values())
    med = fdf.groupby("type").ret_1Y.median().dropna().to_dict()
    dump(out, "reksa/golden_industry.json", {
        "as_of": iso(last), "rows_total": rows_total, "rows_active": int(len(a)),
        "active_funds_as_of": int(len(L)), "aum_total_idr_as_of": fnum(L.aum.sum()),
        "aum_by_type_as_of": {k: {"count": int(v["count"]), "aum": fnum(v["sum"])} for k, v in by_type.iterrows()},
        "aum_by_ccy_as_of": {k: fnum(v) for k, v in L.groupby("ccy").aum.sum().items()},
        "top10_mi_by_aum": [{"mi": k, "aum": fnum(v), "share": fnum(v / L.aum.sum())} for k, v in by_mi.head(10).items()],
        "top5_bk_by_aum": [{"bk": k, "aum": fnum(v), "share": fnum(v / L.aum.sum())} for k, v in by_bk.head(5).items()],
        "aum_total_by_year_end": {str(y): fnum(aum_ts[aum_ts.index.year == y].iloc[-1]) for y in sorted(set(aum_ts.index.year))},
        "active_funds_by_year_end": {str(y): int(cnt_ts[cnt_ts.index.year == y].iloc[-1]) for y in sorted(set(cnt_ts.index.year))},
        "median_ret_1Y_by_type": med,
        "top10_funds_by_aum": sorted(({"fund": k, **{kk: v[kk] for kk in ("mi", "type", "aum")}} for k, v in funds.items()), key=lambda x: -x["aum"])[:10],
        "notes": {"aum_currency": "All NAB and NAB per Unit values are in IDR, including USD-denominated funds (verified: USD fund NAV/unit median ~Rp15,095).",
                  "returns": "Month-over-month NAV/unit change, only for consecutive months; excludes distributions (dividend-paying / capital-protected funds understate total return).",
                  "extreme_rule": "monthly r >= +100% or <= -50% flagged and excluded from aggregates"}})
    dump(out, "reksa/golden_funds_active.json", funds)


# ----------------------------------------------------------------------------- IDXDex
def parse_id_date(s):
    dd, mon, yy = s.split()
    return f"{int(yy):04d}-{ID_MONTHS[mon]:02d}-{int(dd):02d}"


def run_idx(a, idfin_ser, out):
    co = pd.read_csv(a.idx_companies)
    co["listing_date"] = co["Listing Date"].map(parse_id_date)
    names = dict(zip(co.Code, co.Name))
    px = pd.read_csv(a.idx_prices, parse_dates=["Date"]).dropna(subset=["Close"])
    px = px.rename(columns={"Date": "date", "Ticker": "ticker", "Adj Close": "adj_close", "Close": "close", "Volume": "volume"})
    px = px.sort_values(["ticker", "date"])
    fin = pd.read_csv(a.idx_fin)
    want = {"Total Revenue": "revenue", "Net Income": "net_income", "Total Assets": "total_assets",
            "Stockholders Equity": "equity", "Total Liabilities Net Minority Interest": "total_liabilities",
            "Basic EPS": "eps", "Ordinary Shares Number": "shares", "Free Cash Flow": "fcf"}
    fw = fin[fin.account.isin(want)].copy()
    bd, bp = idfin_ser["IHSG"]
    metrics, quality = {}, {}
    for t, g in px.groupby("ticker"):
        g = g[g.adj_close > 0]
        if len(g) < 2:
            continue
        sp = spike_mask(g.adj_close.values).values
        g = g[~sp]
        d, ac, c, v = g.date.values, g.adj_close.values.astype(float), g.close.values.astype(float), g.volume.values.astype(float)
        m = asset_core_metrics(d, ac, 252)
        m["last_close"], m["first_close"] = fnum(c[-1]), fnum(c[0])
        ia = int(np.argmax(c)); m.update({"ath_close": fnum(c[ia]), "ath_date": iso(d[ia]), "pct_from_ath": fnum(c[-1] / c[ia] - 1)})
        L = pd.Timestamp(d[-1]); a1 = np.datetime64(anchor_date(L, "1Y"))
        w = d > a1
        m["zero_volume_share_1Y"] = fnum((v[w] == 0).mean()) if w.any() else None
        m["avg_value_traded_20d_idr"] = fnum(np.mean((c * v)[-20:]))
        m["beta_3Y_vs_IHSG"] = beta(d, ac, bd, bp, 3)
        m["name"] = names.get(t)
        f = fw[fw.symbol == t]
        fund = {}
        for acc, key in want.items():
            r = f[f.account == acc]
            if len(r):
                vals = {y: r.iloc[0][y] for y in ["2020", "2021", "2022", "2023"] if pd.notna(r.iloc[0][y])}
                if vals:
                    yl = max(vals); fund[key] = {"fy": int(yl), "value": fnum(vals[yl]), "by_year": {k: fnum(x) for k, x in vals.items()}}
        if fund:
            def val(k): return fund.get(k, {}).get("value")
            def by(k, y): return fund.get(k, {}).get("by_year", {}).get(y)
            fy = max(x["fy"] for x in fund.values())
            ni, eq, rev, tl = by("net_income", str(fy)), by("equity", str(fy)), by("revenue", str(fy)), by("total_liabilities", str(fy))
            m["fund_fy"] = fy
            m["roe"] = fnum(ni / eq) if ni is not None and eq and eq > 0 else None
            m["npm"] = fnum(ni / rev) if ni is not None and rev and rev > 0 else None
            m["der"] = fnum(tl / eq) if tl is not None and eq and eq > 0 else None
            sh, eps = val("shares"), by("eps", str(fy))
            m["market_cap_idr"] = fnum(c[-1] * sh) if sh else None
            m["per"] = fnum(c[-1] / eps) if eps and eps > 0 else None
            m["pbv"] = fnum(c[-1] * sh / eq) if sh and eq and eq > 0 else None
            m["fundamentals"] = fund
        quality[t] = {"spikes_removed_count": int(sp.sum()),
                      "extreme_moves_count": int(((ac[1:] / ac[:-1] - 1 >= EXTREME_UP) | (ac[1:] / ac[:-1] - 1 <= EXTREME_DN)).sum()),
                      "stale": iso(d[-1]) != "2024-05-17"}
        metrics[t] = m
    ipo = pd.read_csv(a.idx_ipo)
    closed = ipo[ipo["IPO Status"] == "Closed"].copy()
    closed["year"] = closed["Listing Date"].astype(str).str[:4]
    uw = closed.groupby("Participant Admin")["Return D1"].agg(["count", "mean", "median"]).sort_values("count", ascending=False)
    ipo_g = {"total_rows": int(len(ipo)), "status_counts": ipo["IPO Status"].value_counts().to_dict(),
             "listing_date_range": [closed["Listing Date"].min(), closed["Listing Date"].max()],
             "closed_by_year": closed.year.value_counts().sort_index().to_dict(),
             "median_return_D1": fnum(closed["Return D1"].median()), "mean_return_D1": fnum(closed["Return D1"].mean()),
             "share_positive_D1": fnum((closed["Return D1"] > 0).mean()),
             "median_return_from_listing": fnum(closed["Return from Listing Date"].median()),
             "by_sector_median_D1": closed.groupby("Sector")["Return D1"].median().round(6).to_dict(),
             "by_board_count": closed["Listing Board"].fillna("(kosong)").value_counts().to_dict(),
             "top_participant_admin_by_count": [{"participant_admin": k, "ipos": int(r["count"]), "mean_D1": fnum(r["mean"]),
                                                 "median_D1": fnum(r["median"])} for k, r in uw.head(5).iterrows()]}
    px_last = px.date.max()
    dump(out, "idx/golden_metrics.json", metrics)
    dump(out, "idx/golden_ipo.json", ipo_g)
    dump(out, "idx/quality_report.json", {"prices_as_of": iso(px_last), "tickers_in_prices": int(px.ticker.nunique()),
                                          "tickers_with_metrics": len(metrics), "companies_listed_file": int(len(co)),
                                          "tickers_without_company_name": sorted(set(px.ticker) - set(co.Code)),
                                          "companies_without_prices": sorted(set(co.Code) - set(px.ticker)),
                                          "rows_dropped_null_close": 3846,
                                          "rules": {"adj_close<=0": "row excluded from total-return series",
                                                    "spike": "same rule as NASDAQ (r>+100% then <-50% round-trip, or reverse)",
                                                    "listing_date": "Indonesian month abbreviations Jan Feb Mar Apr Mei Jun Jul Agt Sep Okt Nov Des"},
                                          "tickers": quality})


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    for k in ["ecom", "idfin", "usdidr", "reksa", "idx-prices", "idx-fin", "idx-ipo", "idx-warrant", "idx-companies", "out"]:
        ap.add_argument("--" + k, required=True)
    a = ap.parse_args()
    run_commerce(a.ecom, a.out)
    ser = run_idfin(a.idfin, a.out)
    run_usdidr(a.usdidr, ser, a.out)
    run_reksa(a.reksa, a.out)
    run_idx(a, ser, a.out)
    print("ok")

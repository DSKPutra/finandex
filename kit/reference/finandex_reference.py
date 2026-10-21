#!/usr/bin/env python3
"""
Finandex — reference implementation (source of truth for data rules & formulas).
(c) 2026 Dea Saka Kurnia Putra. All rights reserved.

This script is the executable specification that the production app MUST match.
It reads the three raw datasets, applies the cleaning rules, computes every metric,
and writes golden fixtures used by the app's automated tests.

Usage:
  python3 -I finandex_reference.py \
      --global  <global_financial_markets_2000_Now.csv> \
      --nasdaq  <folder with 500 per-ticker CSVs> \
      --sp500   <S_P_500_US_Stock_Market_Data_2026_master_stock_data.csv> \
      --meta    <asset_metadata_authored.json> \
      --out     <output folder>

Conventions (identical in the TypeScript port):
  * Dates are calendar strings 'YYYY-MM-DD'. Never convert to local-time Date objects.
  * Calendar offsets: N months/years back from date L; if the day does not exist in the
    target month, clamp to that month's last day (pandas DateOffset semantics).
  * close_on_or_before(anchor) = last row with date <= anchor, or null if anchor < first row.
  * Simple returns only. Annualisation: 365 for Cryptocurrency, 252 otherwise (incl. stocks).
  * Std-dev uses ddof=1 (sample). Minimum 60 returns for vol/correlation, 120 for beta.
  * Rounding happens ONLY at display time, never in stored metrics.
"""
import argparse, glob, json, math, os
import numpy as np
import pandas as pd

PERIODS = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "3Y", "5Y", "10Y", "MAX"]
MIN_RET_VOL = 60
MIN_RET_BETA = 120
SPIKE_UP, SPIKE_DN, SPIKE_RT = 1.0, -0.5, (0.67, 1.5)
SYSTEMIC_ABS_R, SYSTEMIC_MIN_N, SYSTEMIC_MIN_SHARE = 0.40, 5, 0.02
EXTREME_UP, EXTREME_DN = 1.0, -0.5
LOW_PRECISION_REL_TICK = 0.005  # 0.0001 / last_close >= 0.5%
EW_BASE_DATE = "2000-01-03"


# ----------------------------------------------------------------------------- helpers
def iso(ts):
    return None if ts is None or (isinstance(ts, float) and math.isnan(ts)) else pd.Timestamp(ts).strftime("%Y-%m-%d")


def fnum(x):
    if x is None:
        return None
    x = float(x)
    return None if (math.isnan(x) or math.isinf(x)) else x


def anchor_date(L, period):
    L = pd.Timestamp(L)
    if period == "1W":
        return L - pd.Timedelta(days=7)
    if period == "YTD":
        return pd.Timestamp(year=L.year - 1, month=12, day=31)
    n = {"1M": 1, "3M": 3, "6M": 6}.get(period)
    if n:
        return L - pd.DateOffset(months=n)
    n = {"1Y": 1, "3Y": 3, "5Y": 5, "10Y": 10}.get(period)
    if n:
        return L - pd.DateOffset(years=n)
    raise ValueError(period)


def idx_on_or_before(dates, anchor):
    """dates: sorted np.datetime64 array. Returns index or None."""
    i = np.searchsorted(dates, np.datetime64(anchor), side="right") - 1
    return None if i < 0 else int(i)


def period_metrics(dates, px, ppy):
    """dates sorted datetime64[ns]; px float array (no NaN). Returns dict of returns & cagr."""
    out = {}
    n = len(px)
    if n == 0:
        return {f"ret_{p}": None for p in PERIODS}
    L = pd.Timestamp(dates[-1])
    last = px[-1]
    for p in PERIODS:
        if p == "1D":
            out["ret_1D"] = fnum(last / px[-2] - 1) if n >= 2 else None
            continue
        if p == "MAX":
            out["ret_MAX"] = fnum(last / px[0] - 1) if n >= 2 else None
            days = (L - pd.Timestamp(dates[0])).days
            out["cagr_MAX"] = fnum((last / px[0]) ** (365.25 / days) - 1) if days >= 365 and px[0] > 0 and last > 0 else None
            continue
        a = anchor_date(L, p)
        if np.datetime64(a) < dates[0]:
            out[f"ret_{p}"] = None
            if p in ("3Y", "5Y", "10Y", "1Y"):
                out[f"cagr_{p}"] = None
            continue
        i = idx_on_or_before(dates, a)
        out[f"ret_{p}"] = fnum(last / px[i] - 1)
        if p in ("1Y", "3Y", "5Y", "10Y"):
            days = (L - pd.Timestamp(dates[i])).days
            out[f"cagr_{p}"] = fnum((last / px[i]) ** (365.25 / days) - 1) if px[i] > 0 and last > 0 and days > 0 else None
    return out


def vol_1y(dates, px, ppy):
    if len(px) < 2:
        return None
    L = pd.Timestamp(dates[-1])
    a = np.datetime64(anchor_date(L, "1Y"))
    r = px[1:] / px[:-1] - 1
    rd = dates[1:]
    w = r[rd > a]
    if len(w) < MIN_RET_VOL:
        return None
    return fnum(np.std(w, ddof=1) * math.sqrt(ppy))


def max_drawdown(dates, px):
    if len(px) < 2:
        return {"mdd": None, "mdd_peak_date": None, "mdd_trough_date": None, "mdd_recovery_date": None}
    peak = np.maximum.accumulate(px)
    dd = px / peak - 1
    t = int(np.argmin(dd))
    if dd[t] >= 0:
        return {"mdd": 0.0, "mdd_peak_date": None, "mdd_trough_date": None, "mdd_recovery_date": None}
    p = int(np.argmax(px[: t + 1]))  # first occurrence of the running max before trough
    rec = np.where(px[t:] >= px[p])[0]
    return {
        "mdd": fnum(dd[t]),
        "mdd_peak_date": iso(dates[p]),
        "mdd_trough_date": iso(dates[t]),
        "mdd_recovery_date": iso(dates[t + rec[0]]) if len(rec) else None,
    }


def window_hi_lo(dates, px):
    L = pd.Timestamp(dates[-1])
    a = np.datetime64(anchor_date(L, "1Y"))
    m = dates > a
    if not m.any():
        return None, None, None, None
    d, v = dates[m], px[m]
    ih, il = int(np.argmax(v)), int(np.argmin(v))
    return fnum(v[ih]), iso(d[ih]), fnum(v[il]), iso(d[il])


def calendar_year_returns(dates, px):
    s = pd.Series(px, index=pd.DatetimeIndex(dates))
    ye = s.groupby(s.index.year).last()
    first_year = int(s.index[0].year)
    out = {}
    prev = None
    for y, v in ye.items():
        if prev is None:
            out[str(y)] = {"ret": fnum(v / s.iloc[0] - 1), "partial": True}
        else:
            out[str(y)] = {"ret": fnum(v / prev - 1), "partial": bool(y == s.index[-1].year)}
        prev = v
    return out


def aligned_returns(d1, p1, d2, p2, years):
    L = min(pd.Timestamp(d1[-1]), pd.Timestamp(d2[-1]))
    a = np.datetime64(L - pd.DateOffset(years=years))
    s1 = pd.Series(p1, index=pd.DatetimeIndex(d1))
    s2 = pd.Series(p2, index=pd.DatetimeIndex(d2))
    j = pd.concat([s1, s2], axis=1, join="inner")
    j = j[(j.index > pd.Timestamp(a)) & (j.index <= L)]
    r = j.pct_change().dropna()
    return r.iloc[:, 0].values, r.iloc[:, 1].values


def corr(d1, p1, d2, p2, years=3):
    a, b = aligned_returns(d1, p1, d2, p2, years)
    if len(a) < MIN_RET_VOL:
        return None
    return fnum(np.corrcoef(a, b)[0, 1])


def beta(ds, ps, dm, pm, years=3):
    a, b = aligned_returns(ds, ps, dm, pm, years)
    if len(a) < MIN_RET_BETA:
        return None
    return fnum(np.cov(a, b, ddof=1)[0, 1] / np.var(b, ddof=1))


def sma(px, n):
    return fnum(np.mean(px[-n:])) if len(px) >= n else None


def rsi14(px, n=14):
    if len(px) < n + 1:
        return None
    d = np.diff(px)
    g, l = np.where(d > 0, d, 0.0), np.where(d < 0, -d, 0.0)
    ag, al = g[:n].mean(), l[:n].mean()
    for i in range(n, len(d)):
        ag = (ag * (n - 1) + g[i]) / n
        al = (al * (n - 1) + l[i]) / n
    if al == 0:
        return 100.0
    return fnum(100 - 100 / (1 + ag / al))


def last_cross(px, dates, lookback_rows=60):
    """Most recent SMA50/SMA200 cross within the last `lookback_rows` rows."""
    if len(px) < 200 + lookback_rows:
        return None
    s = pd.Series(px)
    s50, s200 = s.rolling(50).mean().values, s.rolling(200).mean().values
    diff = np.sign(s50 - s200)
    for i in range(len(px) - 1, len(px) - lookback_rows - 1, -1):
        if not np.isnan(diff[i - 1]) and diff[i] != diff[i - 1] and diff[i] != 0:
            return {"type": "golden_cross" if diff[i] > 0 else "death_cross", "date": iso(dates[i])}
    return None


def asset_core_metrics(dates, px, ppy):
    m = {"rows": int(len(px)), "first_date": iso(dates[0]), "last_date": iso(dates[-1]),
         "first_close": fnum(px[0]), "last_close": fnum(px[-1])}
    m.update(period_metrics(dates, px, ppy))
    m["vol_1Y"] = vol_1y(dates, px, ppy)
    m.update(max_drawdown(dates, px))
    h, hd, l, ld = window_hi_lo(dates, px)
    m.update({"hi_52w_close": h, "hi_52w_date": hd, "lo_52w_close": l, "lo_52w_date": ld})
    ia = int(np.argmax(px))
    m.update({"ath_close": fnum(px[ia]), "ath_date": iso(dates[ia]), "pct_from_ath": fnum(px[-1] / px[ia] - 1)})
    return m


# ----------------------------------------------------------------------------- GLOBAL
def run_global(path, meta_path, out):
    meta = json.load(open(meta_path))
    df = pd.read_csv(path, dtype={"symbol": str})
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["symbol", "date"]).reset_index(drop=True)
    assert set(df.symbol.unique()) == set(meta.keys()), "metadata must cover exactly the dataset symbols"
    metrics, cal, series, quality = {}, {}, {}, {}
    for sym, g in df.groupby("symbol"):
        md = meta[sym]
        d, px = g["date"].values, g["close"].values.astype(float)
        m = asset_core_metrics(d, px, md["periods_per_year"])
        m.update({"symbol": sym, "asset_name": g.asset_name.iloc[0], "asset_type": g.asset_type.iloc[0]})
        m["sma50"], m["sma200"], m["rsi14"] = sma(px, 50), sma(px, 200), rsi14(px)
        metrics[sym] = m
        cal[sym] = calendar_year_returns(d, px)
        series[sym] = (d, px)
        o, h, l, c, v = (g[k].values.astype(float) for k in ["open", "high", "low", "close", "volume"])
        sanit = int(((h < np.maximum.reduce([o, l, c])) | (l > np.minimum.reduce([o, h, c]))).sum())
        L = pd.Timestamp(d[-1]); a1 = np.datetime64(anchor_date(L, "1Y"))
        vol_recent = v[d > a1]
        quality[sym] = {
            "candles_sanitized": sanit,
            "flat_ohlc_rows": int(((o == h) & (h == l) & (l == c)).sum()),
            "nonpositive_close_rows": [iso(x) for x in d[c <= 0]],
            "max_gap_calendar_days": int(pd.Series(d).diff().dt.days.max()),
            "has_volume": bool(len(vol_recent) and (vol_recent > 0).mean() >= 0.9),
            "volume_zero_share": fnum((v == 0).mean()),
            "low_precision": bool(0.0001 / abs(c[-1]) >= LOW_PRECISION_REL_TICK),
            "rel_tick_at_last_close": fnum(0.0001 / abs(c[-1])),
        }
    syms = sorted(series)
    corrm = {a: {b: (1.0 if a == b else corr(*series[a], *series[b], years=3)) for b in syms} for a in syms}
    asof = max(m["last_date"] for m in metrics.values())
    catalog = []
    for sym in syms:
        md = dict(meta[sym]); md.update({"symbol": sym, "asset_name": metrics[sym]["asset_name"],
                                         "asset_type": metrics[sym]["asset_type"], "dataset_region": "Global",
                                         "slug": slug(sym), "first_date": metrics[sym]["first_date"],
                                         "last_date": metrics[sym]["last_date"], "rows": metrics[sym]["rows"],
                                         "quality": quality[sym]})
        catalog.append(md)
    dump(out, "global/catalog.json", {"dataset": "global", "as_of": asof, "assets": catalog})
    dump(out, "global/golden_metrics.json", metrics)
    dump(out, "global/golden_calendar_returns.json", cal)
    dump(out, "global/golden_correlation_3y.json", corrm)
    return series, metrics


def slug(sym):
    s = sym.replace("^", "").replace("=", "-").replace(".", "-")
    return s


# ----------------------------------------------------------------------------- STOCK UNIVERSES
def clean_nasdaq(folder):
    frames = []
    for f in sorted(glob.glob(os.path.join(folder, "*.csv"))):
        x = pd.read_csv(f, dtype={"ticker": str})
        frames.append(x)
    df = pd.concat(frames, ignore_index=True)
    df["date"] = pd.to_datetime(df["date"])
    df = df[df.close > 0].sort_values(["ticker", "date"]).reset_index(drop=True)
    df.loc[df.open <= 0, "open"] = np.nan  # open==0 means "not available"
    g = df.groupby("ticker").close
    prev, nxt = g.shift(1), g.shift(-1)
    r, rn, rt = df.close / prev - 1, nxt / df.close - 1, nxt / prev
    spike = ((r > SPIKE_UP) & (rn < SPIKE_DN) & rt.between(*SPIKE_RT)) | \
            ((r < SPIKE_DN) & (rn > SPIKE_UP) & rt.between(*SPIKE_RT))
    spikes = df[spike][["ticker", "date", "close"]].copy()
    df = df[~spike].reset_index(drop=True)
    df["r"] = df.groupby("ticker").close.pct_change()
    active = df[df.r.notna()].groupby("date").size()
    big = df[df.r.abs() > SYSTEMIC_ABS_R].groupby("date").size()
    sysd = [d for d, n in big.items() if n >= SYSTEMIC_MIN_N and n / active.get(d, 1) >= SYSTEMIC_MIN_SHARE]
    sysd = sorted(sysd)
    breaks = df[df.date.isin(sysd) & (df.r.abs() > SYSTEMIC_ABS_R)][["ticker", "date", "r"]]
    reliable_from = breaks.groupby("ticker").date.max().to_dict()
    return df, spikes, sysd, breaks, reliable_from


def stock_universe(df_px, price_col, tr_col, bench, ppy, extra=None):
    """df_px: rows with ticker,date,price_col (and tr_col for total-return metrics)."""
    metrics, cal = {}, {}
    bd, bp = bench
    for t, g in df_px.groupby("ticker"):
        d = g["date"].values
        px = g[tr_col].values.astype(float)        # returns/risk on total-return series
        pr = g[price_col].values.astype(float)     # price display / ATH / 52w / SMA / RSI
        m = asset_core_metrics(d, px, ppy)
        m["last_close"] = fnum(pr[-1]); m["first_close"] = fnum(pr[0])
        h, hd, l, ld = window_hi_lo(d, pr)
        m.update({"hi_52w_close": h, "hi_52w_date": hd, "lo_52w_close": l, "lo_52w_date": ld})
        ia = int(np.argmax(pr)); m.update({"ath_close": fnum(pr[ia]), "ath_date": iso(d[ia]), "pct_from_ath": fnum(pr[-1] / pr[ia] - 1)})
        m["sma50"], m["sma200"], m["rsi14"] = sma(pr, 50), sma(pr, 200), rsi14(pr)
        m["above_sma200"] = (m["sma200"] is not None) and bool(pr[-1] > m["sma200"])
        m["last_cross"] = last_cross(pr, d)
        m["multiple_MAX"] = fnum(px[-1] / px[0]) if len(px) >= 2 else None
        m["beta_3Y"] = beta(d, px, bd, bp, 3) if len(px) > 1 else None
        m["corr_bench_3Y"] = corr(d, px, bd, bp, 3) if len(px) > 1 else None
        if tr_col != price_col:
            m["price_ret_1Y"] = period_metrics(d, pr, ppy).get("ret_1Y")
            m["price_ret_5Y"] = period_metrics(d, pr, ppy).get("ret_5Y")
        m["ticker"] = t
        metrics[t] = m
        cal[t] = calendar_year_returns(d, px)
    return metrics, cal


def pulse(df_px, metrics, price_col, base_date=EW_BASE_DATE):
    """Universe breadth + equal-weight (EW) universe index.
    EW index: level 100 at the close of base_date; daily EW return = arithmetic mean of the
    simple daily returns of all tickers that have a bar on that date AND on their previous row,
    EXCLUDING returns flagged as extreme (r >= +100% or r <= -50%). Survivorship-biased by design
    (universe = tickers present in the dataset today) -> must always be labelled as such."""
    asof = df_px.date.max()
    df_px = df_px.sort_values(["ticker", "date"]).copy()
    df_px["r"] = df_px.groupby("ticker")[price_col].pct_change()
    today = df_px[df_px.date == asof]
    adv, dec = int((today.r > 0).sum()), int((today.r < 0).sum())
    unch = int((today.r == 0).sum())
    elig = [m for m in metrics.values() if m["last_date"] == iso(asof) and m["sma200"] is not None]
    pct200 = fnum(np.mean([m["above_sma200"] for m in elig])) if elig else None
    nh = sum(1 for m in metrics.values() if m["last_date"] == iso(asof) and m["hi_52w_date"] == iso(asof))
    nl = sum(1 for m in metrics.values() if m["last_date"] == iso(asof) and m["lo_52w_date"] == iso(asof))
    ok = df_px.r.notna() & (df_px.r < EXTREME_UP) & (df_px.r > EXTREME_DN) & (df_px.date > pd.Timestamp(base_date))
    rr = df_px[ok].groupby("date").r.agg(["mean", "size"])
    lvl = 100 * np.cumprod(1 + rr["mean"].values)
    ew = pd.Series(lvl, index=rr.index)
    ye = ew.groupby(ew.index.year).last()
    return {"as_of": iso(asof), "tickers_with_bar_on_as_of": int(len(today)), "advancers": adv, "decliners": dec,
            "unchanged": unch, "pct_above_sma200": pct200, "sma200_eligible": len(elig),
            "new_52w_highs": nh, "new_52w_lows": nl,
            "ew_index": {"base_date": base_date, "base_level": 100.0,
                         "constituents_on_first_return_date": int(rr["size"].iloc[0]),
                         "constituents_on_as_of": int(rr["size"].iloc[-1]),
                         "level_as_of": fnum(lvl[-1]), "year_end_levels": {str(k): fnum(v) for k, v in ye.items()}}}


def run_nasdaq(folder, gseries, out):
    df, spikes, sysd, breaks, rel = clean_nasdaq(folder)
    keep = []
    for t, g in df.groupby("ticker"):
        rf = rel.get(t)
        keep.append(g if rf is None else g[g.date >= rf])
    dfa = pd.concat(keep, ignore_index=True)[["ticker", "date", "open", "high", "low", "close"]]
    metrics, cal = stock_universe(dfa, "close", "close", gseries["^IXIC"], 252)
    # extreme (non-systemic) moves inside the analysis window
    dfa = dfa.sort_values(["ticker", "date"]); dfa["r"] = dfa.groupby("ticker").close.pct_change()
    ext = dfa[(dfa.r >= EXTREME_UP) | (dfa.r <= EXTREME_DN)]
    quality = {}
    for t in sorted(df.ticker.unique()):
        quality[t] = {
            "spikes_removed": [iso(x) for x in spikes[spikes.ticker == t].date],
            "systemic_breaks": [iso(x) for x in breaks[breaks.ticker == t].date],
            "reliable_from": iso(rel.get(t)) if t in rel else None,
            "extreme_moves": [{"date": iso(r.date), "ret": fnum(r.r)} for r in ext[ext.ticker == t].itertuples()],
            "rows_raw_after_spike_removal": int((df.ticker == t).sum()),
            "rows_in_analysis_window": int((dfa.ticker == t).sum()),
            "insufficient_history": bool((dfa.ticker == t).sum() < MIN_RET_VOL + 1),
        }
        metrics[t]["quality_flags"] = [k for k, v in [("spike_removed", quality[t]["spikes_removed"]),
                                                       ("systemic_break", quality[t]["systemic_breaks"]),
                                                       ("extreme_move", quality[t]["extreme_moves"]),
                                                       ("insufficient_history", quality[t]["insufficient_history"])] if v]
    pul = pulse(dfa[["ticker", "date", "close"]], metrics, "close")
    dump(out, "nasdaq/golden_metrics.json", metrics)
    dump(out, "nasdaq/golden_calendar_returns.json", cal)
    dump(out, "nasdaq/quality_report.json", {"systemic_dates": [iso(x) for x in sysd],
                                             "rules": {"spike_up": SPIKE_UP, "spike_dn": SPIKE_DN, "spike_roundtrip": SPIKE_RT,
                                                       "systemic_abs_r": SYSTEMIC_ABS_R, "systemic_min_n": SYSTEMIC_MIN_N,
                                                       "systemic_min_share": SYSTEMIC_MIN_SHARE,
                                                       "extreme_up": EXTREME_UP, "extreme_dn": EXTREME_DN},
                                             "totals": {"spikes_removed": int(len(spikes)), "systemic_break_rows": int(len(breaks)),
                                                        "tickers_with_reliable_from": len(rel), "extreme_moves": int(len(ext))},
                                             "tickers": quality})
    dump(out, "nasdaq/golden_pulse.json", pul)
    return metrics


def run_sp500(path, gseries, out):
    df = pd.read_csv(path, dtype={"Ticker": str})
    n0 = len(df)
    df = df.dropna(subset=["Close", "Adj Close"])
    dropped = n0 - len(df)
    df = df.rename(columns={"Date": "date", "Ticker": "ticker", "Adj Close": "adj_close", "Close": "close",
                            "Open": "open", "High": "high", "Low": "low", "Volume": "volume",
                            "Dividends": "dividends", "Stock Splits": "splits"})
    df["date"] = pd.to_datetime(df["date"])
    df = df.sort_values(["ticker", "date"]).reset_index(drop=True)
    metrics, cal = stock_universe(df, "close", "adj_close", gseries["^GSPC"], 252)
    divs, sp_quality = {}, {}
    for t, g in df.groupby("ticker"):
        d = g.date.values; L = pd.Timestamp(d[-1]); a1 = np.datetime64(anchor_date(L, "1Y"))
        dv = g[g.dividends > 0]
        ttm = float(dv[dv.date.values > a1].dividends.sum())
        annual = dv.groupby(dv.date.dt.year).dividends.sum()
        last_full = L.year - 1
        years = list(range(int(g.date.dt.year.min()), last_full + 1))
        ann = {y: float(annual.get(y, 0.0)) for y in years}
        streak = 0
        y = last_full
        while y - 1 in ann and ann[y] > 0 and ann[y] > ann[y - 1]:
            streak += 1; y -= 1
        def dcagr(n):
            a, b = ann.get(last_full - n, 0.0), ann.get(last_full, 0.0)
            return fnum((b / a) ** (1 / n) - 1) if a > 0 and b > 0 else None
        vol = g.volume.values.astype(float); vol = np.where(vol > 0, vol, np.nan)
        c = g.close.values.astype(float)
        a3 = np.datetime64(anchor_date(L, "3M"))
        divs[t] = {
            "ttm_dividends": fnum(ttm), "ttm_yield": fnum(ttm / c[-1]) if ttm > 0 else 0.0,
            "annual_dividends": {str(k): fnum(v) for k, v in ann.items() if v > 0},
            "last_full_year": last_full, "dividend_increase_streak_years": streak,
            "dividend_cagr_5Y": dcagr(5), "dividend_cagr_10Y": dcagr(10),
            "last_dividend": ({"date": iso(dv.date.values[-1]), "amount": fnum(dv.dividends.values[-1])} if len(dv) else None),
            "splits": [{"date": iso(r.date), "ratio": fnum(r.splits)} for r in g[g.splits > 0].itertuples()],
            "avg_volume_20d": fnum(np.nanmean(vol[-20:])) if np.isfinite(vol[-20:]).any() else None,
            "avg_volume_3M": fnum(np.nanmean(vol[g.date.values > a3])) if np.isfinite(vol[g.date.values > a3]).any() else None,
            "avg_dollar_volume_20d": fnum(np.nanmean((c * vol)[-20:])) if np.isfinite(vol[-20:]).any() else None,
        }
        metrics[t].update({"ttm_yield": divs[t]["ttm_yield"], "dividend_increase_streak_years": streak,
                           "avg_dollar_volume_20d": divs[t]["avg_dollar_volume_20d"]})
        ar = g.adj_close.values.astype(float); rr_ = ar[1:] / ar[:-1] - 1
        ext = [{"date": iso(dd), "ret": fnum(x)} for dd, x in zip(d[1:], rr_) if x >= EXTREME_UP or x <= EXTREME_DN]
        sp_quality[t] = {"extreme_moves": ext, "insufficient_history": bool(len(g) < MIN_RET_VOL + 1)}
        metrics[t]["quality_flags"] = [k for k, v in [("extreme_move", ext), ("insufficient_history", sp_quality[t]["insufficient_history"])] if v]
    pul = pulse(df[["ticker", "date", "adj_close"]].rename(columns={"adj_close": "close"}), metrics, "close")
    dump(out, "sp500/golden_metrics.json", metrics)
    dump(out, "sp500/golden_calendar_returns.json", cal)
    dump(out, "sp500/golden_dividends_volume.json", divs)
    dump(out, "sp500/golden_pulse.json", pul)
    dump(out, "sp500/quality_report.json", {"rows_dropped_null_close": dropped,
                                            "rules": {"extreme_up": EXTREME_UP, "extreme_dn": EXTREME_DN, "returns_basis": "Adj Close"},
                                            "tickers_insufficient_history": [t for t, q in sp_quality.items() if q["insufficient_history"]],
                                            "tickers": sp_quality})
    # DRIP simulator golden example
    sims = []
    for t, start, amt in [("MSFT", "2010-01-04", 10000.0), ("KO", "2000-01-03", 10000.0), ("AAPL", "2015-01-02", 10000.0)]:
        g = df[df.ticker == t]
        if g.empty:
            continue
        s = g[g.date <= pd.Timestamp(start)].iloc[-1]; e = g.iloc[-1]
        drip = amt * e.adj_close / s.adj_close
        shares = amt / s.close
        cash = float((g[(g.date > s.date) & (g.date <= e.date)].dividends * shares).sum())
        sims.append({"ticker": t, "start_request": start, "start_date": iso(s.date), "end_date": iso(e.date), "amount_usd": amt,
                     "value_with_reinvestment": fnum(drip), "value_price_only": fnum(shares * e.close),
                     "dividends_cash_no_reinvest": fnum(cash), "value_without_reinvestment_incl_cash": fnum(shares * e.close + cash)})
    dump(out, "sp500/golden_simulator.json", sims)
    return metrics, divs


def dump(out, rel, obj):
    p = os.path.join(out, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w") as f:
        json.dump(obj, f, indent=1, ensure_ascii=False, allow_nan=False)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--global", dest="glob", required=True)
    ap.add_argument("--nasdaq", required=True)
    ap.add_argument("--sp500", required=True)
    ap.add_argument("--meta", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    gs, gm = run_global(a.glob, a.meta, a.out)
    run_nasdaq(a.nasdaq, gs, a.out)
    run_sp500(a.sp500, gs, a.out)
    print("ok")

// © 2026 Dea Saka Kurnia Putra. All rights reserved.
// SnP500Dex (§8.5): S&P 500 constituents with dividends and splits (pending-data until input #3 is uploaded).
import { stockTools } from '../stock-tools.ts';

export const tools = stockTools('sp500', 'S&P 500 stocks daily (OHLCV, dividends, splits)');

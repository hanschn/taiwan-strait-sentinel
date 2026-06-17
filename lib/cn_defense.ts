// China A-share defense / military industry tracker.
// Data source: data/cn_defense.json (refreshed daily by scripts/update_cn_defense.py
// running via .github/workflows/update-cn-defense.yml; upstream = Eastmoney push2his
// K-line + 主力資金 net inflow, with Tencent K-line fallback).
//
// 主力評分演算法 (composite, max 100) — now anchored on REAL 主力資金 flow:
//   主力5日淨流入  0–30  pts  (Σ5 主力淨流入 ÷ Σ5 成交額, 越高越強)
//   今日主力淨占比 0–15  pts  (∝ 當日主力淨占比%)
//   5日漲幅        0–15  pts  (∝ ret5, cap +10%)
//   連漲天數       0–10  pts  (5 pts × days, 限 2 日)
//   站上 20MA      0/10  pts
//   MACD 多頭      0/10  pts  (DIF > DEA 且 DIF > 0)
//   突破 20 日高   0/10  pts

import raw from "@/data/cn_defense.json";

export type Bar = {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount?: number; // 成交額 (元), present from Eastmoney; absent from Tencent fallback
};

export type Flow = {
  date: string;
  mainNet: number; // 主力淨流入 (元)
  mainPct: number; // 主力淨占比 (%)
};

type RawTicker = {
  code: string;
  market: string;
  name: string;
  sector: string;
  group: "etfs" | "stocks";
  bars: Bar[];
  flow?: Flow[];
};

export type Ticker = Omit<RawTicker, "bars" | "flow"> & {
  bars: Bar[];
  flow: Flow[];
  last: Bar | null;
  dayChange: number;
  ret5: number;
  ret20: number;
  volRatio: number;
  mainNetLast: number; // 元
  mainNet5: number; // 元 (Σ 近 5 日)
  mainPctLast: number; // %
  score: number;
  breakdown: Record<string, number>;
};

export type CnDefenseSnapshot = {
  etfs: Ticker[];
  stocks: Ticker[];
  series: Array<Record<string, number | string>>;
  seriesKeys: { code: string; name: string }[];
  updated: string;
  source: "live" | "fallback";
  asOf: string | null;
  staleness: number;
};

function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

function pctChange(bars: Bar[], lookback: number): number {
  if (bars.length < lookback + 1) return 0;
  const a = bars[bars.length - 1 - lookback].close;
  const b = bars[bars.length - 1].close;
  if (!a) return 0;
  return (b / a - 1) * 100;
}

// 成交額 over the last `lookback` bars. Uses real 成交額 (元) when available,
// else proxies with volume(手) × 100 × close.
function turnoverSum(bars: Bar[], lookback: number): number {
  return bars.slice(-lookback).reduce((s, b) => {
    const amt = b.amount && b.amount > 0 ? b.amount : b.volume * 100 * b.close;
    return s + amt;
  }, 0);
}

function ema(values: number[], period: number): number[] {
  if (values.length === 0) return [];
  const k = 2 / (period + 1);
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) {
    out.push(values[i] * k + out[i - 1] * (1 - k));
  }
  return out;
}

function macd(bars: Bar[]): { dif: number; dea: number; hist: number } {
  const closes = bars.map((b) => b.close);
  const e12 = ema(closes, 12);
  const e26 = ema(closes, 26);
  const dif = e12.map((v, i) => v - e26[i]);
  const dea = ema(dif, 9);
  const last = dif.length - 1;
  return { dif: dif[last], dea: dea[last], hist: dif[last] - dea[last] };
}

function consecutiveUpDays(bars: Bar[]): number {
  let n = 0;
  for (let i = bars.length - 1; i > 0; i--) {
    if (bars[i].close > bars[i - 1].close) n++;
    else break;
  }
  return n;
}

export function mainForceScore(
  bars: Bar[],
  flow: Flow[]
): {
  score: number;
  breakdown: Record<string, number>;
} {
  if (bars.length < 30) return { score: 0, breakdown: {} };
  const last = bars[bars.length - 1];

  const ret5 = pctChange(bars, 5);
  const upDays = consecutiveUpDays(bars);

  const ma20 =
    bars.slice(-20).reduce((s, b) => s + b.close, 0) / Math.min(20, bars.length);
  const aboveMa20 = last.close > ma20;

  const { dif, dea } = macd(bars);
  const macdBullish = dif > dea && dif > 0;

  const high20 = Math.max(...bars.slice(-20).map((b) => b.high));
  const breakHigh = last.high >= high20 * 0.999;

  // --- 主力資金 (real institutional money flow) ---
  const flow5 = flow.slice(-5);
  const mainNet5 = flow5.reduce((s, f) => s + f.mainNet, 0);
  const turnover5 = turnoverSum(bars, 5);
  const flowRatioPct = turnover5 > 0 ? (mainNet5 / turnover5) * 100 : 0;
  const mainPctLast = flow.length ? flow[flow.length - 1].mainPct : 0;

  const breakdown: Record<string, number> = {
    主力5日淨流入: clamp(flowRatioPct * 5, 0, 30),
    主力淨占比: clamp(mainPctLast * 2, 0, 15),
    "5日漲幅": clamp(ret5 * 1.5, 0, 15),
    連漲天數: clamp(upDays * 5, 0, 10),
    站上20MA: aboveMa20 ? 10 : 0,
    MACD多頭: macdBullish ? 10 : 0,
    突破20日高: breakHigh ? 10 : 0,
  };
  const score = Math.round(
    Object.values(breakdown).reduce((a, b) => a + b, 0)
  );
  return { score: clamp(score, 0, 100), breakdown };
}

function enrichMetrics(t: RawTicker): Ticker {
  const bars = t.bars;
  const flow = t.flow ?? [];
  if (bars.length === 0) {
    return {
      ...t,
      bars,
      flow,
      last: null,
      dayChange: 0,
      ret5: 0,
      ret20: 0,
      volRatio: 1,
      mainNetLast: 0,
      mainNet5: 0,
      mainPctLast: 0,
      score: 0,
      breakdown: {},
    };
  }
  const last = bars[bars.length - 1];
  const dayChange = pctChange(bars, 1);
  const ret5 = pctChange(bars, 5);
  const ret20 = pctChange(bars, 20);
  const vol5 =
    bars.length >= 6
      ? bars.slice(-6, -1).reduce((s, b) => s + b.volume, 0) / 5
      : last.volume;
  const volRatio = vol5 > 0 ? last.volume / vol5 : 1;

  const mainNetLast = flow.length ? flow[flow.length - 1].mainNet : 0;
  const mainNet5 = flow.slice(-5).reduce((s, f) => s + f.mainNet, 0);
  const mainPctLast = flow.length ? flow[flow.length - 1].mainPct : 0;

  const { score, breakdown } = mainForceScore(bars, flow);
  return {
    ...t,
    bars,
    flow,
    last,
    dayChange,
    ret5,
    ret20,
    volRatio,
    mainNetLast,
    mainNet5,
    mainPctLast,
    score,
    breakdown,
  };
}

function buildNormalizedSeries(
  items: RawTicker[],
  days: number
): Array<Record<string, number | string>> {
  const ref = items.find((it) => it.bars.length >= days) ?? items[0];
  if (!ref || ref.bars.length === 0) return [];
  const dates = ref.bars.slice(-days).map((b) => b.date);

  const bases: Record<string, number> = {};
  for (const it of items) {
    const slice = it.bars.slice(-days);
    bases[it.code] = slice[0]?.close ?? 1;
  }

  return dates.map((date, i) => {
    const row: Record<string, number | string> = { date };
    for (const it of items) {
      const slice = it.bars.slice(-days);
      const close = slice[i]?.close;
      if (typeof close === "number" && bases[it.code]) {
        row[it.code] = Number(((close / bases[it.code]) * 100).toFixed(2));
      }
    }
    return row;
  });
}

const FALLBACK: CnDefenseSnapshot = {
  etfs: [],
  stocks: [],
  series: [],
  seriesKeys: [],
  updated: new Date().toISOString(),
  source: "fallback",
  asOf: null,
  staleness: 9999,
};

export function getCnDefenseSnapshot(today = new Date()): CnDefenseSnapshot {
  const data = raw as unknown as {
    updated: string;
    tickers: Record<string, RawTicker>;
  };
  const list = Object.values(data.tickers);
  if (list.length === 0) return FALLBACK;

  const etfsRaw = list.filter((t) => t.group === "etfs");
  const stocksRaw = list.filter((t) => t.group === "stocks");

  const etfs = etfsRaw.map(enrichMetrics);
  const stocks = stocksRaw.map(enrichMetrics).sort((a, b) => b.score - a.score);

  const series = buildNormalizedSeries(etfsRaw, 60);
  const seriesKeys = etfsRaw.map((e) => ({ code: e.code, name: e.name }));

  const latestDates = [...etfs, ...stocks]
    .map((t) => t.last?.date)
    .filter((d): d is string => !!d);
  const asOf = latestDates.length ? latestDates.sort().slice(-1)[0] : null;

  const updated = new Date(data.updated);
  const staleness = Math.max(
    0,
    Math.floor((today.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    etfs,
    stocks,
    series,
    seriesKeys,
    updated: data.updated,
    source: "live",
    asOf,
    staleness,
  };
}

export function scoreColor(score: number): {
  text: string;
  bar: string;
  label: string;
} {
  if (score >= 70) return { text: "text-red-400", bar: "bg-red-500", label: "主力進場" };
  if (score >= 50) return { text: "text-orange-300", bar: "bg-orange-500", label: "資金注意" };
  if (score >= 30) return { text: "text-amber-300", bar: "bg-amber-500", label: "趨勢偏多" };
  return { text: "text-white/55", bar: "bg-white/30", label: "盤整" };
}

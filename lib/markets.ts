// Multi-source prediction-market aggregator for "will China attack/invade Taiwan".
//
// Why this replaces the old single-source lib/polymarket.ts:
//   - It depended on ONE hardcoded slug (`china-invades-taiwan-in-2026`) that has
//     since closed → the Gamma API returns an empty array → the app silently fell
//     back to a HARDCODED 4%. Users saw a fake number.
//   - This module pulls several live markets, blends them into one index, exposes
//     the per-source spread, and — when every source is unreachable — falls back to
//     the last-good snapshot committed at data/markets.json (NEVER a fake number).
//
// Curated market IDs (verified June 2026 — clean, non-conditional "will it happen"
// markets, not "if it happens will it succeed" markets):
//   Polymarket : china-x-taiwan-military-clash-before-2027   (~$2.0M, real money)
//   Manifold   : will-china-attempt-to-invade-taiwan         (play money)
//   Kalshi     : no liquid Taiwan-invasion market exists yet → slot wired, returns null.

import cached from "@/data/markets.json";

export type MarketSource = {
  name: string; // "Polymarket" | "Manifold" | "Kalshi"
  kind: "real" | "play"; // real-money vs play-money market
  prob: number; // 0..1 implied YES probability
  volume: number; // native units
  volumeLabel: string; // formatted with units ($ / MANA)
  question: string;
  url: string;
  weight: number; // blend weight (real-money markets weighted higher)
};

export type MarketSnapshot = {
  prob: number | null; // blended 0..1, null when no data at all
  sources: MarketSource[];
  spread: { min: number; max: number } | null;
  source: "live" | "cached" | "unavailable";
  updatedAt: string;
  staleness: number; // minutes since updatedAt (only meaningful when cached)
  question: string; // headline label
};

const HEADLINE_Q = "中國 2026–27 對台動武機率";
const REVALIDATE = 300; // 5 min — odds barely move faster than this

function compactUsd(n: number): string {
  if (!n || Number.isNaN(n)) return "$—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(0)}`;
}

function compactPlain(n: number): string {
  if (!n || Number.isNaN(n)) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n.toFixed(0)}`;
}

async function fetchPolymarket(): Promise<MarketSource | null> {
  // Try candidate slugs in priority order; use the first active, liquid one.
  const slugs = [
    "china-x-taiwan-military-clash-before-2027",
    "will-china-invade-taiwan-before-2027",
    "will-china-invade-taiwan-by-june-30-2027",
  ];
  for (const slug of slugs) {
    try {
      const res = await fetch(
        `https://gamma-api.polymarket.com/markets?slug=${slug}`,
        { next: { revalidate: REVALIDATE }, headers: { Accept: "application/json" } }
      );
      if (!res.ok) continue;
      const arr = (await res.json()) as Array<{
        question?: string;
        slug?: string;
        outcomePrices?: string;
        volume?: string | number;
        closed?: boolean;
        active?: boolean;
      }>;
      const m = Array.isArray(arr) ? arr[0] : null;
      if (!m || m.closed || m.active === false) continue;
      let yes = NaN;
      if (typeof m.outcomePrices === "string") {
        const parsed = JSON.parse(m.outcomePrices) as string[];
        if (parsed.length >= 1) yes = Number(parsed[0]);
      }
      if (!Number.isFinite(yes)) continue;
      const volume = Number(m.volume ?? 0);
      return {
        name: "Polymarket",
        kind: "real",
        prob: Math.max(0, Math.min(1, yes)),
        volume,
        volumeLabel: compactUsd(volume),
        question: m.question ?? slug,
        url: `https://polymarket.com/event/${m.slug ?? slug}`,
        weight: 1,
      };
    } catch {
      /* try next slug */
    }
  }
  return null;
}

async function fetchManifold(): Promise<MarketSource | null> {
  const slug = "will-china-attempt-to-invade-taiwan";
  try {
    const res = await fetch(`https://api.manifold.markets/v0/slug/${slug}`, {
      next: { revalidate: REVALIDATE },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const m = (await res.json()) as {
      probability?: number;
      volume?: number;
      question?: string;
      url?: string;
      isResolved?: boolean;
      outcomeType?: string;
    };
    if (!m || m.isResolved || typeof m.probability !== "number") return null;
    const volume = Number(m.volume ?? 0);
    return {
      name: "Manifold",
      kind: "play",
      prob: Math.max(0, Math.min(1, m.probability)),
      volume,
      volumeLabel: `${compactPlain(volume)} MANA`,
      question: m.question ?? slug,
      url: m.url ?? `https://manifold.markets/${slug}`,
      weight: 0.4, // play-money: informative but down-weighted vs real money
    };
  } catch {
    return null;
  }
}

async function fetchKalshi(): Promise<MarketSource | null> {
  // As of June 2026 Kalshi has no liquid China-invades-Taiwan market (its China
  // markets are tariffs / AI). Slot is wired for when one appears; until then we
  // honestly contribute nothing rather than fake a source.
  return null;
}

function blend(sources: MarketSource[]): number {
  const wsum = sources.reduce((s, x) => s + x.weight, 0) || 1;
  return sources.reduce((s, x) => s + x.prob * x.weight, 0) / wsum;
}

export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const settled = await Promise.allSettled([
    fetchPolymarket(),
    fetchManifold(),
    fetchKalshi(),
  ]);
  const sources = settled.flatMap((r) =>
    r.status === "fulfilled" && r.value ? [r.value] : []
  );

  if (sources.length > 0) {
    const probs = sources.map((s) => s.prob);
    return {
      prob: blend(sources),
      sources,
      spread: { min: Math.min(...probs), max: Math.max(...probs) },
      source: "live",
      updatedAt: new Date().toISOString(),
      staleness: 0,
      question: HEADLINE_Q,
    };
  }

  // All live sources failed → last-good committed snapshot (real, dated value).
  const c = cached as unknown as {
    prob?: number;
    sources?: MarketSource[];
    spread?: { min: number; max: number } | null;
    updatedAt?: string;
  };
  if (c && typeof c.prob === "number" && c.updatedAt) {
    const ageMin = Math.max(
      0,
      Math.floor((Date.now() - new Date(c.updatedAt).getTime()) / 60000)
    );
    return {
      prob: c.prob,
      sources: c.sources ?? [],
      spread: c.spread ?? null,
      source: "cached",
      updatedAt: c.updatedAt,
      staleness: ageMin,
      question: HEADLINE_Q,
    };
  }

  // Nothing live, no cache → be honest, show no number.
  return {
    prob: null,
    sources: [],
    spread: null,
    source: "unavailable",
    updatedAt: new Date().toISOString(),
    staleness: 9999,
    question: HEADLINE_Q,
  };
}

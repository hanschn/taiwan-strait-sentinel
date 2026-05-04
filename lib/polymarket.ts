// Polymarket Gamma API client for "China invades Taiwan in 2026"
// Docs: https://docs.polymarket.com/

export type PolymarketSnapshot = {
  slug: string;
  question: string;
  yesPrice: number; // 0..1, treat as implied probability
  noPrice: number;
  volumeUsd: number;
  liquidityUsd: number;
  endDate: string | null;
  updatedAt: string;
  source: "live" | "fallback";
};

const SLUG = "china-invades-taiwan-in-2026";
const GAMMA_URL = `https://gamma-api.polymarket.com/markets?slug=${SLUG}`;

const FALLBACK: PolymarketSnapshot = {
  slug: SLUG,
  question: "Will China invade Taiwan in 2026?",
  yesPrice: 0.04,
  noPrice: 0.96,
  volumeUsd: 0,
  liquidityUsd: 0,
  endDate: "2026-12-31T23:59:59Z",
  updatedAt: new Date().toISOString(),
  source: "fallback",
};

export async function getPolymarketSnapshot(): Promise<PolymarketSnapshot> {
  try {
    const res = await fetch(GAMMA_URL, {
      next: { revalidate: 60 },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return FALLBACK;
    const data = (await res.json()) as Array<{
      question?: string;
      slug?: string;
      outcomePrices?: string;
      volume?: string | number;
      liquidity?: string | number;
      endDate?: string;
    }>;
    const market = Array.isArray(data) ? data[0] : null;
    if (!market) return FALLBACK;

    // outcomePrices is a JSON-encoded string like "[\"0.04\", \"0.96\"]"
    let yesPrice = FALLBACK.yesPrice;
    let noPrice = FALLBACK.noPrice;
    if (typeof market.outcomePrices === "string") {
      try {
        const parsed = JSON.parse(market.outcomePrices) as string[];
        if (parsed.length >= 2) {
          yesPrice = Number(parsed[0]);
          noPrice = Number(parsed[1]);
        }
      } catch {
        /* keep fallback */
      }
    }

    return {
      slug: market.slug ?? SLUG,
      question: market.question ?? FALLBACK.question,
      yesPrice,
      noPrice,
      volumeUsd: Number(market.volume ?? 0),
      liquidityUsd: Number(market.liquidity ?? 0),
      endDate: market.endDate ?? FALLBACK.endDate,
      updatedAt: new Date().toISOString(),
      source: "live",
    };
  } catch {
    return FALLBACK;
  }
}

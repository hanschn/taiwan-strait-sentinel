// Scraper for Taiwan MND daily PLA activity report
// Source: https://www.mnd.gov.tw/news/plaactlist
//
// Each daily report includes a sentence like:
//   "偵獲共機 X 架次（進入...）、共艦 Y 艘及公務船 Z 艘，持續在臺海周邊活動"
// Date is ROC year (民國), e.g. 115/05/03 = 2026/05/03.

export type MndDailyEntry = {
  date: string; // ISO YYYY-MM-DD (period end)
  aircraft24h: number;
  vessels24h: number;
  officialShips24h: number;
  detailUrl: string;
};

export type MndSnapshot = {
  date: string;
  aircraft24h: number;
  vessels24h: number;
  officialShips24h: number;
  source: "live" | "fallback";
  fetchedAt: string;
  sourceUrl: string;
  detailUrl: string | null;
  history: MndDailyEntry[]; // ascending by date, includes latest
};

const LIST_URL = "https://www.mnd.gov.tw/news/plaactlist";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FALLBACK_HISTORY: MndDailyEntry[] = [
  { date: "2026-04-27", aircraft24h: 9, vessels24h: 6, officialShips24h: 1, detailUrl: "" },
  { date: "2026-04-28", aircraft24h: 14, vessels24h: 8, officialShips24h: 2, detailUrl: "" },
  { date: "2026-04-29", aircraft24h: 11, vessels24h: 7, officialShips24h: 3, detailUrl: "" },
  { date: "2026-04-30", aircraft24h: 17, vessels24h: 9, officialShips24h: 2, detailUrl: "" },
  { date: "2026-05-01", aircraft24h: 8, vessels24h: 6, officialShips24h: 4, detailUrl: "" },
  { date: "2026-05-02", aircraft24h: 12, vessels24h: 7, officialShips24h: 3, detailUrl: "" },
  { date: "2026-05-03", aircraft24h: 2, vessels24h: 8, officialShips24h: 3, detailUrl: "" },
];

const FALLBACK: MndSnapshot = {
  ...FALLBACK_HISTORY[FALLBACK_HISTORY.length - 1],
  source: "fallback",
  fetchedAt: new Date().toISOString(),
  sourceUrl: LIST_URL,
  detailUrl: null,
  history: FALLBACK_HISTORY,
};

const FETCH_HEADERS = {
  "User-Agent": UA,
  Accept: "text/html,application/xhtml+xml",
  "Accept-Language": "zh-TW,zh;q=0.9",
};

function rocToIso(roc: string): string | null {
  const m = roc.match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]) + 1911;
  const mo = m[2].padStart(2, "0");
  const d = m[3].padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

function stripText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x([0-9a-f]+);/gi, (_, c) => String.fromCharCode(parseInt(c, 16)))
    .replace(/\s+/g, " ");
}

async function fetchDetail(id: string): Promise<MndDailyEntry | null> {
  const url = `https://www.mnd.gov.tw/news/plaact/${id}`;
  try {
    const res = await fetch(url, {
      next: { revalidate: 3600, tags: ["mnd"] },
      headers: FETCH_HEADERS,
    });
    if (!res.ok) return null;
    const text = stripText(await res.text());

    const a = text.match(/共機\s*(\d+)\s*架次/);
    const v = text.match(/共艦\s*(\d+)\s*艘/);
    const o = text.match(/公務船\s*(\d+)\s*艘/);
    if (!a || !v) return null;

    let iso: string | null = null;
    const rocSpaced = text.match(
      /中華民國\s*(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/
    );
    if (rocSpaced)
      iso = rocToIso(`${rocSpaced[1]}/${rocSpaced[2]}/${rocSpaced[3]}`);
    if (!iso) {
      const slash = text.match(/(\d{2,3})\/(\d{1,2})\/(\d{1,2})/);
      if (slash) iso = rocToIso(`${slash[1]}/${slash[2]}/${slash[3]}`);
    }
    if (!iso) return null;

    return {
      date: iso,
      aircraft24h: Number(a[1]),
      vessels24h: Number(v[1]),
      officialShips24h: o ? Number(o[1]) : 0,
      detailUrl: url,
    };
  } catch {
    return null;
  }
}

export async function getMndSnapshot(days = 7): Promise<MndSnapshot> {
  try {
    const listRes = await fetch(LIST_URL, {
      next: { revalidate: 3600, tags: ["mnd"] },
      headers: FETCH_HEADERS,
    });
    if (!listRes.ok) return FALLBACK;
    const listHtml = await listRes.text();

    const ids = Array.from(
      listHtml.matchAll(/href="news\/plaact\/(\d+)"/g)
    ).map((m) => m[1]);
    const uniqueIds = Array.from(new Set(ids)).slice(0, days * 3); // some entries may not be daily reports
    if (uniqueIds.length === 0) return FALLBACK;

    const results = await Promise.all(uniqueIds.map(fetchDetail));
    const valid = results.filter((r): r is MndDailyEntry => r !== null);

    // Dedup by date (keep first encountered which is most recent)
    const byDate = new Map<string, MndDailyEntry>();
    for (const r of valid) {
      if (!byDate.has(r.date)) byDate.set(r.date, r);
    }
    const sorted = Array.from(byDate.values()).sort((a, b) =>
      a.date.localeCompare(b.date)
    );
    const history = sorted.slice(-days);
    if (history.length === 0) return FALLBACK;

    const latest = history[history.length - 1];
    return {
      ...latest,
      source: "live",
      fetchedAt: new Date().toISOString(),
      sourceUrl: LIST_URL,
      history,
    };
  } catch {
    return FALLBACK;
  }
}

export function compositeRiskScore(s: {
  aircraft24h: number;
  vessels24h: number;
  officialShips24h: number;
}): { score: number; level: "LOW" | "ELEVATED" | "HIGH" | "SEVERE" } {
  const a = s.aircraft24h;
  const v = s.vessels24h;
  const o = s.officialShips24h;
  const score = Math.min(
    100,
    Math.round(a * 1.4 + v * 2.2 + o * 1.5 + (a > 30 ? 10 : 0) + (v > 15 ? 8 : 0))
  );
  const level: "LOW" | "ELEVATED" | "HIGH" | "SEVERE" =
    score >= 75
      ? "SEVERE"
      : score >= 50
        ? "HIGH"
        : score >= 25
          ? "ELEVATED"
          : "LOW";
  return { score, level };
}

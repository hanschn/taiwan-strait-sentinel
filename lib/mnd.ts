// Scraper for Taiwan MND daily PLA activity report
// Source: https://www.mnd.gov.tw/news/plaactlist
//
// Each daily report includes a sentence like:
//   "偵獲共機 X 架次（進入...）、共艦 Y 艘及公務船 Z 艘，持續在臺海周邊活動"
// Date is ROC year (民國), e.g. 115/05/03 = 2026/05/03.

export type MndSnapshot = {
  date: string; // ISO YYYY-MM-DD (period end)
  aircraft24h: number;
  vessels24h: number;
  officialShips24h: number;
  source: "live" | "fallback";
  fetchedAt: string;
  sourceUrl: string;
  detailUrl: string | null;
};

const LIST_URL = "https://www.mnd.gov.tw/news/plaactlist";
const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const FALLBACK: MndSnapshot = {
  date: "2026-05-03",
  aircraft24h: 2,
  vessels24h: 8,
  officialShips24h: 3,
  source: "fallback",
  fetchedAt: new Date().toISOString(),
  sourceUrl: LIST_URL,
  detailUrl: null,
};

function rocToIso(roc: string): string | null {
  // "115/05/03" -> "2026-05-03"
  const m = roc.match(/^(\d{2,3})\/(\d{1,2})\/(\d{1,2})$/);
  if (!m) return null;
  const y = Number(m[1]) + 1911;
  const mo = m[2].padStart(2, "0");
  const d = m[3].padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

export async function getMndSnapshot(): Promise<MndSnapshot> {
  try {
    const listRes = await fetch(LIST_URL, {
      next: { revalidate: 3600, tags: ["mnd"] },
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "zh-TW,zh;q=0.9",
      },
    });
    if (!listRes.ok) return FALLBACK;
    const listHtml = await listRes.text();

    const idMatch = listHtml.match(/href="news\/plaact\/(\d+)"/);
    if (!idMatch) return FALLBACK;
    const detailUrl = `https://www.mnd.gov.tw/news/plaact/${idMatch[1]}`;

    const detailRes = await fetch(detailUrl, {
      next: { revalidate: 3600, tags: ["mnd"] },
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "zh-TW,zh;q=0.9",
      },
    });
    if (!detailRes.ok) return FALLBACK;
    const detailHtml = await detailRes.text();

    // Strip tags and decode minimal entities
    const text = detailHtml
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/\s+/g, " ");

    const aircraft = text.match(/共機\s*(\d+)\s*架次/);
    const vessels = text.match(/共艦\s*(\d+)\s*艘/);
    const officialShips = text.match(/公務船\s*(\d+)\s*艘/);

    // Date — prefer the ROC date inside "中華民國 XXX 年 X 月 X 日"
    let iso: string | null = null;
    const rocSpaced = text.match(/中華民國\s*(\d{2,3})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
    if (rocSpaced) {
      iso = rocToIso(`${rocSpaced[1]}/${rocSpaced[2]}/${rocSpaced[3]}`);
    }
    if (!iso) {
      const slash = text.match(/(\d{2,3})\/(\d{1,2})\/(\d{1,2})/);
      if (slash) iso = rocToIso(`${slash[1]}/${slash[2]}/${slash[3]}`);
    }
    if (!iso) iso = new Date().toISOString().slice(0, 10);

    if (!aircraft || !vessels) return { ...FALLBACK, detailUrl };

    return {
      date: iso,
      aircraft24h: Number(aircraft[1]),
      vessels24h: Number(vessels[1]),
      officialShips24h: officialShips ? Number(officialShips[1]) : 0,
      source: "live",
      fetchedAt: new Date().toISOString(),
      sourceUrl: LIST_URL,
      detailUrl,
    };
  } catch {
    return FALLBACK;
  }
}

export function compositeRiskScore(s: MndSnapshot): {
  score: number;
  level: "LOW" | "ELEVATED" | "HIGH" | "SEVERE";
} {
  // Heuristic 0..100 based on PLA activity volume vs. recent baseline.
  // Baseline: ~10 aircraft / ~7 vessels per 24h is "normal" (2024-25 avg).
  const a = s.aircraft24h;
  const v = s.vessels24h;
  const o = s.officialShips24h;

  const score = Math.min(
    100,
    Math.round(a * 1.4 + v * 2.2 + o * 1.5 + (a > 30 ? 10 : 0) + (v > 15 ? 8 : 0))
  );

  const level =
    score >= 75 ? "SEVERE" : score >= 50 ? "HIGH" : score >= 25 ? "ELEVATED" : "LOW";
  return { score, level };
}

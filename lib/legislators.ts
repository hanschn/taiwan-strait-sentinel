import data from "@/data/legislators.json";

export type LegislatorAbroad = {
  name: string;
  party: string;
  country: string;
  purpose: string;
  departed: string; // YYYY-MM-DD
  returns: string; // YYYY-MM-DD
};

export type LegislatorSnapshot = {
  updated: string;
  lastChecked: string | null; // ISO datetime the news was last scanned
  term: number;
  totalSeats: number;
  abroad: LegislatorAbroad[];
  abroadCount: number;
  inTaiwan: number;
  inTaiwanPct: number;
  source: string;
  sourceUrl: string;
  staleness: number; // days since last update
};

export function getLegislatorSnapshot(today = new Date()): LegislatorSnapshot {
  const todayIso = today.toISOString().slice(0, 10);
  // An entry counts as "currently abroad" iff today is within [departed, returns]
  const currentlyAbroad = data.abroad.filter(
    (a) => a.departed <= todayIso && todayIso <= a.returns
  );

  const updated = new Date(data.updated);
  const ms = today.getTime() - updated.getTime();
  const staleness = Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));

  const inTaiwan = data.totalSeats - currentlyAbroad.length;
  const inTaiwanPct = (inTaiwan / data.totalSeats) * 100;

  return {
    updated: data.updated,
    lastChecked: "lastChecked" in data ? (data.lastChecked as string) : null,
    term: data.term,
    totalSeats: data.totalSeats,
    abroad: currentlyAbroad,
    abroadCount: currentlyAbroad.length,
    inTaiwan,
    inTaiwanPct,
    source: data.source,
    sourceUrl: data.sourceUrl,
    staleness,
  };
}

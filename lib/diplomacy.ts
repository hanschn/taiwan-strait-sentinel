// 外賓訪台 / 外交動態 — recent high-profile foreign delegations visiting Taiwan
// and major diplomatic events (the Pelosi-style tension signal).
// Source: data/diplomacy.json, refreshed daily by scripts/update_legislators.py
// (Google News RSS multi-query).

import data from "@/data/diplomacy.json";

export type DiplomacyEvent = {
  title: string;
  source: string;
  date: string; // YYYY-MM-DD
  url: string;
};

export type DiplomacySnapshot = {
  updated: string;
  count7d: number;
  events: DiplomacyEvent[];
  staleness: number; // days since last update
};

export function getDiplomacySnapshot(today = new Date()): DiplomacySnapshot {
  const updated = new Date(data.updated);
  const staleness = Math.max(
    0,
    Math.floor((today.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24))
  );
  return {
    updated: data.updated,
    count7d: data.count7d ?? 0,
    events: (data.events ?? []) as DiplomacyEvent[],
    staleness,
  };
}

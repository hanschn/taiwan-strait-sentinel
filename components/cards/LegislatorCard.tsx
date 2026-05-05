"use client";

import { motion } from "framer-motion";
import { ExternalLink, Plane, Users } from "lucide-react";
import Card from "@/components/Card";
import type { LegislatorSnapshot } from "@/lib/legislators";

type Props = { snapshot: LegislatorSnapshot };

const partyColor: Record<string, string> = {
  民主進步黨: "text-green-300",
  中國國民黨: "text-blue-300",
  台灣民眾黨: "text-cyan-300",
};

export default function LegislatorCard({ snapshot }: Props) {
  const r = 78;
  const c = 2 * Math.PI * r;
  const offset = c - (snapshot.inTaiwanPct / 100) * c;

  const updatedFmt = new Date(snapshot.updated).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const isStale = snapshot.staleness > 7;

  return (
    <Card
      id="legislative"
      eyebrow="Legislative Alert"
      title="立委在台比例"
      subtitle={`第 ${snapshot.term} 屆 · ${snapshot.totalSeats} 席`}
      badge={
        <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-amber-300">
          <Plane className="h-3 w-3" strokeWidth={2} />
          {snapshot.abroadCount} 人出國
        </div>
      }
    >
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
        <div className="relative h-[200px] w-[200px] shrink-0">
          <svg
            viewBox="0 0 200 200"
            className="h-full w-full -rotate-90"
            aria-hidden
          >
            <circle
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="10"
            />
            <motion.circle
              cx="100"
              cy="100"
              r={r}
              fill="none"
              stroke="url(#legGrad)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={c}
              initial={{ strokeDashoffset: c }}
              whileInView={{ strokeDashoffset: offset }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            />
            <defs>
              <linearGradient id="legGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#30d158" />
                <stop offset="100%" stopColor="#5ac8fa" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className="text-[44px] font-semibold leading-none tracking-[-0.02em]"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {snapshot.inTaiwanPct.toFixed(1)}%
            </span>
            <span className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
              在台
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-2.5">
          <Row
            icon={<Users className="h-4 w-4 text-white/70" />}
            label="總席次"
            value={snapshot.totalSeats}
            accent="text-white"
          />
          <Row
            icon={<Users className="h-4 w-4 text-emerald-400" />}
            label="當前在台"
            value={snapshot.inTaiwan}
            accent="text-emerald-400"
          />
          <Row
            icon={<Plane className="h-4 w-4 text-amber-400" />}
            label="出國中"
            value={snapshot.abroadCount}
            accent="text-amber-400"
          />
        </div>
      </div>

      {/* Abroad list */}
      {snapshot.abroad.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 text-[11px] uppercase tracking-[0.2em] text-white/45">
            Currently Abroad
          </div>
          <ul className="space-y-1.5">
            {snapshot.abroad.slice(0, 5).map((a) => (
              <li
                key={a.name}
                className="flex items-center justify-between rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2 text-[12.5px]"
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span className="font-medium text-white">{a.name}</span>
                  <span
                    className={`text-[10px] ${partyColor[a.party] ?? "text-white/45"}`}
                  >
                    {a.party.replace("民主進步黨", "民進黨").replace("中國國民黨", "國民黨")}
                  </span>
                  <span className="truncate text-white/55">· {a.purpose}</span>
                </div>
                <div className="ml-3 shrink-0 text-[11px] text-white/55">
                  🇺🇳 {a.country}
                  <span className="ml-2 text-white/35">~{a.returns.slice(5)}</span>
                </div>
              </li>
            ))}
          </ul>
          {snapshot.abroad.length > 5 && (
            <div className="mt-1.5 text-center text-[11px] text-white/40">
              +{snapshot.abroad.length - 5} 更多…
            </div>
          )}
        </div>
      )}

      {/* Freshness footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
        <div className="flex items-center gap-2 text-white/45">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${
                isStale ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                isStale ? "bg-amber-400" : "bg-emerald-400"
              }`}
            />
          </span>
          <span>
            {isStale ? "STALE" : "FRESH"} · 資料更新於 {updatedFmt}
          </span>
          {isStale && (
            <span className="text-amber-300/80">
              · {snapshot.staleness}d ago
            </span>
          )}
        </div>
        <a
          href={snapshot.sourceUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-white/55 transition hover:text-white"
        >
          資料源
          <ExternalLink className="h-3 w-3" strokeWidth={2} />
        </a>
      </div>

      <p className="mt-2 text-[11px] text-white/35">
        資料來源：{snapshot.source}。每日 06:00 GitHub Action 自動同步至 repo。
      </p>
    </Card>
  );
}

function Row({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2 text-[14px]">
      <div className="flex items-center gap-2 text-white/65">
        {icon}
        <span>{label}</span>
      </div>
      <span
        className={`font-semibold ${accent}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
    </div>
  );
}

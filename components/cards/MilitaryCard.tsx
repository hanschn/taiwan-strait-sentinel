"use client";

import { motion } from "framer-motion";
import { Anchor, ExternalLink, Plane, Ship } from "lucide-react";
import Card from "@/components/Card";
import type { MndSnapshot } from "@/lib/mnd";

type Props = { mnd: MndSnapshot };

const levelClass: Record<string, string> = {
  LOW: "text-emerald-300",
  ELEVATED: "text-amber-300",
  HIGH: "text-orange-300",
  SEVERE: "text-red-300",
};

function compositeRiskScore(s: MndSnapshot) {
  const a = s.aircraft24h;
  const v = s.vessels24h;
  const o = s.officialShips24h;
  const score = Math.min(
    100,
    Math.round(a * 1.4 + v * 2.2 + o * 1.5 + (a > 30 ? 10 : 0) + (v > 15 ? 8 : 0))
  );
  const level: "LOW" | "ELEVATED" | "HIGH" | "SEVERE" =
    score >= 75 ? "SEVERE" : score >= 50 ? "HIGH" : score >= 25 ? "ELEVATED" : "LOW";
  return { score, level };
}

export default function MilitaryCard({ mnd }: Props) {
  const { score, level } = compositeRiskScore(mnd);
  const reportDate = new Date(mnd.date).toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "short",
    day: "numeric",
    weekday: "short",
  });
  const fetchedTime = new Date(mnd.fetchedAt).toLocaleString("zh-TW", {
    hour12: false,
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Card
      id="military"
      eyebrow="Military Readiness"
      title="解放軍動態"
      subtitle={`國防部 ${reportDate} 公告 · 24h 偵獲`}
      badge={
        <div
          className={`glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] ${levelClass[level]}`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          {level}
        </div>
      }
    >
      <div className="grid gap-6 sm:grid-cols-2">
        {/* Radar visual */}
        <div className="relative mx-auto h-[220px] w-[220px]">
          <div className="absolute inset-0 rounded-full border border-white/10" />
          <div className="absolute inset-[14%] rounded-full border border-white/10" />
          <div className="absolute inset-[30%] rounded-full border border-white/10" />
          <div className="absolute inset-[46%] rounded-full border border-white/10" />
          <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/5" />
          <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-white/5" />

          <div
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(255,69,58,0.55) 30deg, transparent 70deg)",
              animation: "radar-sweep 4s linear infinite",
              maskImage: "radial-gradient(circle, black 60%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(circle, black 60%, transparent 100%)",
            }}
          />

          {/* contacts — count scales with aircraft activity */}
          {Array.from({
            length: Math.min(CONTACTS.length, Math.max(2, Math.round(mnd.aircraft24h / 4))),
          }).map((_, i) => {
            const c = CONTACTS[i];
            return (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 * i, duration: 0.5 }}
                className="absolute h-1.5 w-1.5 rounded-full bg-red-400 shadow-[0_0_10px_rgba(255,69,58,0.8)]"
                style={{
                  left: `${50 + c.x}%`,
                  top: `${50 + c.y}%`,
                  animation: "pulse-dot 2s ease-in-out infinite",
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            );
          })}

          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
        </div>

        {/* Stats */}
        <div className="flex flex-col justify-center gap-4">
          <Stat
            icon={<Plane className="h-4 w-4 text-red-400" />}
            label="共機擾台"
            value={mnd.aircraft24h}
            unit="架次 / 24h"
          />
          <Stat
            icon={<Ship className="h-4 w-4 text-red-400" />}
            label="共艦現蹤"
            value={mnd.vessels24h}
            unit="艘 / 24h"
          />
          <Stat
            icon={<Anchor className="h-4 w-4 text-red-400" />}
            label="公務船"
            value={mnd.officialShips24h}
            unit="艘 / 24h"
          />

          <div className="mt-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">
              Composite Risk Score
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className={`text-[36px] font-semibold leading-none tracking-[-0.02em] ${levelClass[level]}`}
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {score}
              </span>
              <span className="text-[14px] text-white/40">/ 100</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${score}%` }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
        <div className="flex items-center gap-2 text-white/45">
          <span className="relative flex h-1.5 w-1.5">
            <span
              className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-70 ${
                mnd.source === "live" ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span
              className={`relative inline-flex h-1.5 w-1.5 rounded-full ${
                mnd.source === "live" ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
          </span>
          <span>
            {mnd.source === "live" ? "LIVE · MND" : "CACHED · 抓取失敗顯示備援值"}
          </span>
          <span className="text-white/25">·</span>
          <span>同步於 {fetchedTime}</span>
        </div>
        {mnd.detailUrl && (
          <a
            href={mnd.detailUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-white/55 transition hover:text-white"
          >
            原文
            <ExternalLink className="h-3 w-3" strokeWidth={2} />
          </a>
        )}
      </div>

      <p className="mt-2 text-[11.5px] text-white/35">
        資料來源：國防部「即時軍事動態 — 中共解放軍臺海周邊海、空域動態」每日公告。
        伺服器每小時自動重抓並重生頁面。
      </p>
    </Card>
  );
}

function Stat({
  icon,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  unit: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-3">
      <div className="flex items-center gap-2 text-[14px] text-white/65">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="text-[22px] font-semibold tracking-[-0.01em] text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </span>
        <span className="text-[11px] text-white/45">{unit}</span>
      </div>
    </div>
  );
}

const CONTACTS = [
  { x: -32, y: -20 },
  { x: -18, y: 28 },
  { x: 24, y: -34 },
  { x: 36, y: 12 },
  { x: 8, y: 38 },
  { x: -40, y: 8 },
];

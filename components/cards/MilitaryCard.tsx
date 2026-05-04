"use client";

import { motion } from "framer-motion";
import { Crosshair, Plane, Ship } from "lucide-react";
import Card from "@/components/Card";

// Placeholder data — to be wired into MND daily PLA activity report
// (mnd.gov.tw) or 中科院 OSINT feeds.
const RISK = {
  level: "ELEVATED" as const,
  score: 42, // 0..100
  aircraft24h: 17,
  vessels24h: 9,
  medianLine: 6, // crossings 7d
};

const levelColor: Record<string, string> = {
  LOW: "from-emerald-400/40 to-emerald-500/10 text-emerald-300",
  ELEVATED: "from-amber-400/40 to-amber-500/10 text-amber-300",
  HIGH: "from-orange-500/50 to-red-500/10 text-orange-300",
  SEVERE: "from-red-500/60 to-red-600/10 text-red-300",
};

export default function MilitaryCard() {
  return (
    <Card
      id="military"
      eyebrow="Military Readiness"
      title="解放軍動態"
      subtitle="台海周邊軍機 / 艦艇 / 越線活動 (24h)"
      badge={
        <div
          className={`glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] ${levelColor[RISK.level].split(" ").slice(-1)[0]}`}
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-60" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
          </span>
          {RISK.level}
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

          {/* sweep */}
          <div
            aria-hidden
            className="absolute inset-0 rounded-full"
            style={{
              background:
                "conic-gradient(from 0deg, transparent 0deg, rgba(255,69,58,0.55) 30deg, transparent 70deg)",
              animation: "radar-sweep 4s linear infinite",
              maskImage:
                "radial-gradient(circle, black 60%, transparent 100%)",
              WebkitMaskImage:
                "radial-gradient(circle, black 60%, transparent 100%)",
            }}
          />

          {/* contacts */}
          {CONTACTS.map((c, i) => (
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
          ))}

          {/* center = Taiwan */}
          <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)]" />
        </div>

        {/* Stats */}
        <div className="flex flex-col justify-center gap-4">
          <Stat
            icon={<Plane className="h-4 w-4 text-red-400" />}
            label="軍機擾台"
            value={RISK.aircraft24h}
            unit="架次 / 24h"
          />
          <Stat
            icon={<Ship className="h-4 w-4 text-red-400" />}
            label="艦艇現蹤"
            value={RISK.vessels24h}
            unit="艘 / 24h"
          />
          <Stat
            icon={<Crosshair className="h-4 w-4 text-red-400" />}
            label="越中線"
            value={RISK.medianLine}
            unit="次 / 7d"
          />

          <div className="mt-2 rounded-2xl border border-white/8 bg-white/[0.02] p-4">
            <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">
              Composite Risk Score
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="text-[36px] font-semibold leading-none tracking-[-0.02em] text-amber-300"
                style={{ fontVariantNumeric: "tabular-nums" }}
              >
                {RISK.score}
              </span>
              <span className="text-[14px] text-white/40">/ 100</span>
            </div>
            <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/8">
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${RISK.score}%` }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
                className="h-full bg-gradient-to-r from-emerald-400 via-amber-400 to-red-500"
              />
            </div>
          </div>
        </div>
      </div>

      <p className="mt-6 text-[12.5px] leading-relaxed text-white/45">
        資料來源：國防部即時軍事動態 / OSINT 觀測（每日更新）。指標含括軍機擾台、海軍部署、越線次數。
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

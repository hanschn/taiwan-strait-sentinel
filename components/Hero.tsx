"use client";

import { motion } from "framer-motion";
import { ArrowDown, Activity } from "lucide-react";
import type { MarketSnapshot } from "@/lib/markets";

type Props = { snapshot: MarketSnapshot };

const easeOut = [0.22, 1, 0.36, 1] as const;

function riskLabel(p: number | null) {
  if (p === null) return { text: "N/A", color: "text-white/50" };
  if (p < 0.05) return { text: "LOW", color: "text-emerald-400" };
  if (p < 0.15) return { text: "ELEVATED", color: "text-amber-400" };
  if (p < 0.3) return { text: "HIGH", color: "text-orange-400" };
  return { text: "SEVERE", color: "text-red-400" };
}

function statusText(s: MarketSnapshot): string {
  if (s.source === "live") return `LIVE · ${s.sources.length} 個市場`;
  if (s.source === "cached") return "CACHED · 即時來源暫時無回應";
  return "資料暫時無法取得";
}

export default function Hero({ snapshot }: Props) {
  const pct = snapshot.prob === null ? null : Math.max(0, Math.min(1, snapshot.prob)) * 100;
  const risk = riskLabel(snapshot.prob);
  const updated = new Date(snapshot.updatedAt).toLocaleString("zh-TW", {
    hour12: false,
  });
  const live = snapshot.source === "live";
  const topReal =
    snapshot.sources.find((s) => s.kind === "real") ?? snapshot.sources[0];
  const spreadText = snapshot.spread
    ? `${(snapshot.spread.min * 100).toFixed(1)}–${(snapshot.spread.max * 100).toFixed(1)}%`
    : "—";

  return (
    <section className="relative flex min-h-[100svh] flex-col items-center justify-center px-6 pt-28">
      {/* status pill */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: easeOut, delay: 0.1 }}
        className="glass mb-8 flex items-center gap-2 rounded-full px-4 py-1.5 text-[12px] tracking-wide text-white/70"
      >
        <span className="relative flex h-2 w-2">
          <span
            className={`absolute inline-flex h-full w-full animate-ping rounded-full opacity-60 ${
              live ? "bg-red-400" : "bg-amber-400"
            }`}
          />
          <span
            className={`relative inline-flex h-2 w-2 rounded-full ${
              live ? "bg-red-400" : "bg-amber-400"
            }`}
          />
        </span>
        <span>{statusText(snapshot)}</span>
        <span className="text-white/30">·</span>
        <span className="text-white/50">更新於 {updated}</span>
      </motion.div>

      {/* Title */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: easeOut, delay: 0.15 }}
        className="text-balance text-center text-[44px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[64px] md:text-[80px]"
      >
        市場相信
        <br />
        <span className="bg-gradient-to-b from-white to-white/55 bg-clip-text text-transparent">
          中國對台動武機率
        </span>
      </motion.h1>

      {/* Giant percentage */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: easeOut, delay: 0.35 }}
        className="relative mt-10 flex flex-col items-center"
      >
        <div className="flex items-baseline gap-2">
          <span
            className="bg-gradient-to-b from-red-300 via-red-400 to-red-600 bg-clip-text text-[140px] font-semibold leading-none tracking-[-0.05em] text-transparent sm:text-[200px] md:text-[260px]"
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {pct === null ? "—" : pct.toFixed(1)}
          </span>
          {pct !== null && (
            <span className="text-[60px] font-light text-white/60 sm:text-[80px]">
              %
            </span>
          )}
        </div>

        <div className="mt-2 flex items-center gap-3 text-[13px] uppercase tracking-[0.18em] text-white/50">
          <Activity className="h-3.5 w-3.5" strokeWidth={1.8} />
          <span>Risk Level</span>
          <span className={`font-medium ${risk.color}`}>{risk.text}</span>
        </div>
      </motion.div>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: easeOut, delay: 0.55 }}
        className="mt-12 max-w-2xl text-balance text-center text-[17px] leading-relaxed text-white/60 sm:text-[19px]"
      >
        綜合多個即時預測市場的「真金白銀」共識，
        將模糊的地緣風險，化為可量化的指標。
      </motion.p>

      {/* Mini stat row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: easeOut, delay: 0.7 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-[13px] text-white/55"
      >
        <Stat label="資料來源" value={`${snapshot.sources.length} 個預測市場`} />
        <Stat label="最高交易量" value={topReal ? topReal.volumeLabel : "—"} />
        <Stat label="各市場區間" value={spreadText} />
      </motion.div>

      {/* Scroll cue */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, ease: easeOut, delay: 1.1 }}
        className="absolute bottom-10 flex flex-col items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-white/35"
      >
        <span>Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <ArrowDown className="h-4 w-4" strokeWidth={1.5} />
        </motion.div>
      </motion.div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="text-[10px] uppercase tracking-[0.2em] text-white/35">
        {label}
      </span>
      <span
        className="mt-1 font-medium text-white/85"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </span>
    </div>
  );
}

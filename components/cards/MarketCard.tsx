"use client";

import { motion } from "framer-motion";
import { ExternalLink, TrendingUp } from "lucide-react";
import Card from "@/components/Card";
import type { PolymarketSnapshot } from "@/lib/polymarket";

type Props = { snapshot: PolymarketSnapshot };

export default function MarketCard({ snapshot }: Props) {
  const yesPct = Math.max(0, Math.min(1, snapshot.yesPrice)) * 100;
  const noPct = 100 - yesPct;

  return (
    <Card
      id="market"
      eyebrow="Market Sentiment"
      title="Polymarket 預測"
      subtitle={`「${snapshot.question}」`}
      badge={
        <a
          href={`https://polymarket.com/event/${snapshot.slug}`}
          target="_blank"
          rel="noreferrer"
          className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-white/70 transition hover:text-white"
        >
          Polymarket
          <ExternalLink className="h-3 w-3" strokeWidth={2} />
        </a>
      }
    >
      <div className="grid items-center gap-8 sm:grid-cols-[1fr_1fr]">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="bg-gradient-to-b from-red-300 via-red-400 to-red-600 bg-clip-text text-[88px] font-semibold leading-none tracking-[-0.04em] text-transparent"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {yesPct.toFixed(1)}
            </span>
            <span className="text-[36px] text-white/55">%</span>
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/65">
            <TrendingUp className="h-3 w-3" />
            YES 隱含機率
          </div>
        </div>

        <div className="space-y-4">
          {/* YES bar */}
          <Bar label="YES (將發生)" pct={yesPct} color="from-red-500 to-red-400" />
          {/* NO bar */}
          <Bar label="NO (不會發生)" pct={noPct} color="from-emerald-500 to-emerald-400" />

          <div className="grid grid-cols-2 gap-3 pt-2 text-[12px]">
            <Mini label="Volume" value={`$${formatCompact(snapshot.volumeUsd)}`} />
            <Mini label="Liquidity" value={`$${formatCompact(snapshot.liquidityUsd)}`} />
          </div>
        </div>
      </div>

      <p className="mt-7 text-[12.5px] leading-relaxed text-white/45">
        資料來源：Polymarket Gamma API（每 60 秒更新一次）。價格 = 市場隱含機率，反映參與者「真金白銀」下注的共識。
      </p>
    </Card>
  );
}

function Bar({
  label,
  pct,
  color,
}: {
  label: string;
  pct: number;
  color: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
        <span className="text-white/60">{label}</span>
        <span
          className="font-medium text-white/85"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {pct.toFixed(1)}%
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-white/8">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className={`h-full bg-gradient-to-r ${color}`}
        />
      </div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-white/40">
        {label}
      </div>
      <div
        className="mt-1 text-[16px] font-medium text-white/90"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (!n || Number.isNaN(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${n.toFixed(0)}`;
}

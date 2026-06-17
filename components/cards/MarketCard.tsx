"use client";

import { motion } from "framer-motion";
import { ExternalLink, TrendingUp } from "lucide-react";
import Card from "@/components/Card";
import type { MarketSnapshot, MarketSource } from "@/lib/markets";

type Props = { snapshot: MarketSnapshot };

export default function MarketCard({ snapshot }: Props) {
  const blended = snapshot.prob;
  const blendedPct = blended === null ? null : Math.max(0, Math.min(1, blended)) * 100;
  const top = snapshot.sources.find((s) => s.kind === "real") ?? snapshot.sources[0];
  const spreadText = snapshot.spread
    ? `${(snapshot.spread.min * 100).toFixed(1)}–${(snapshot.spread.max * 100).toFixed(1)}%`
    : "—";

  return (
    <Card
      id="market"
      eyebrow="Market Sentiment"
      title="預測市場共識"
      subtitle="多個即時預測市場的隱含機率混合"
      badge={
        top && (
          <a
            href={top.url}
            target="_blank"
            rel="noreferrer"
            className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-white/70 transition hover:text-white"
          >
            {top.name}
            <ExternalLink className="h-3 w-3" strokeWidth={2} />
          </a>
        )
      }
    >
      <div className="grid items-center gap-8 sm:grid-cols-[1fr_1.15fr]">
        <div>
          <div className="flex items-baseline gap-2">
            <span
              className="bg-gradient-to-b from-red-300 via-red-400 to-red-600 bg-clip-text text-[88px] font-semibold leading-none tracking-[-0.04em] text-transparent"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {blendedPct === null ? "—" : blendedPct.toFixed(1)}
            </span>
            {blendedPct !== null && (
              <span className="text-[36px] text-white/55">%</span>
            )}
          </div>
          <div className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white/5 px-2.5 py-1 text-[11px] text-white/65">
            <TrendingUp className="h-3 w-3" />
            混合隱含機率
          </div>
          <div className="mt-3 text-[11.5px] text-white/45">
            各市場區間 <span className="text-white/70">{spreadText}</span>
            {snapshot.source === "cached" && (
              <span className="ml-2 text-amber-300/80">· 顯示最後快取值</span>
            )}
          </div>
        </div>

        <div className="space-y-3">
          {snapshot.sources.length === 0 ? (
            <div className="rounded-xl border border-white/8 bg-white/[0.02] px-4 py-6 text-center text-[12.5px] text-white/45">
              即時預測市場暫時無法取得，請稍後重試。
            </div>
          ) : (
            snapshot.sources.map((s) => <SourceRow key={s.name} s={s} />)
          )}
        </div>
      </div>

      <p className="mt-7 text-[12.5px] leading-relaxed text-white/45">
        資料來源：Polymarket（真金白銀）+ Manifold（社群點數），每 5 分鐘更新；
        即時來源全數無回應時顯示最後快取值，不以寫死數字魚目混珠。價格 = 市場隱含機率。
      </p>
    </Card>
  );
}

function SourceRow({ s }: { s: MarketSource }) {
  const pct = Math.max(0, Math.min(1, s.prob)) * 100;
  const real = s.kind === "real";
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.02] px-3.5 py-2.5">
      <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
        <span className="flex items-center gap-2">
          <span className="font-medium text-white/85">{s.name}</span>
          <span
            className={`rounded-full px-1.5 py-0.5 text-[9.5px] ${
              real ? "bg-red-500/15 text-red-300" : "bg-amber-500/15 text-amber-300"
            }`}
          >
            {real ? "真金白銀" : "社群點數"}
          </span>
        </span>
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
          className={`h-full bg-gradient-to-r ${
            real ? "from-red-500 to-red-400" : "from-amber-500 to-amber-400"
          }`}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[10.5px] text-white/40">
        <span className="truncate pr-2">{s.question}</span>
        <span className="shrink-0">量 {s.volumeLabel}</span>
      </div>
    </div>
  );
}

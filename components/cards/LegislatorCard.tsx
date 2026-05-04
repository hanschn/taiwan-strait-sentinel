"use client";

import { motion } from "framer-motion";
import { Plane, Users } from "lucide-react";
import Card from "@/components/Card";

// Placeholder — will be wired to a daily Python scrape of
// 立法院公務出國報告 (https://www.ly.gov.tw/...). Total seats: 113.
const TOTAL = 113;
const ABROAD = 4;
const IN_TAIWAN = TOTAL - ABROAD;
const inTaiwanPct = (IN_TAIWAN / TOTAL) * 100;

export default function LegislatorCard() {
  const r = 78;
  const c = 2 * Math.PI * r;
  const offset = c - (inTaiwanPct / 100) * c;

  return (
    <Card
      id="legislative"
      eyebrow="Legislative Alert"
      title="立委在台比例"
      subtitle="若關鍵時刻立委集中出國 → 國會空轉風險"
      badge={
        <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-white/70">
          <Plane className="h-3 w-3" strokeWidth={2} />
          {ABROAD} 人出國
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
              {inTaiwanPct.toFixed(1)}%
            </span>
            <span className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">
              在台
            </span>
          </div>
        </div>

        <div className="flex-1 space-y-3">
          <Row icon={<Users className="h-4 w-4" />} label="立委總席次" value={TOTAL} accent="text-white" />
          <Row icon={<Users className="h-4 w-4 text-emerald-400" />} label="當前在台" value={IN_TAIWAN} accent="text-emerald-400" />
          <Row icon={<Plane className="h-4 w-4 text-amber-400" />} label="出國中" value={ABROAD} accent="text-amber-400" />
          <p className="pt-3 text-[12.5px] leading-relaxed text-white/45">
            資料來源：立法院公務出國報告（每日爬取）。當前風險層級偏低。
          </p>
        </div>
      </div>
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

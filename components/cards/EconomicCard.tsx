"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingUp, BarChart3, Coins } from "lucide-react";
import Card from "@/components/Card";

// Source: World Bank · IMF · UN Comtrade (annual, approximate)
// 內需 = Final consumption / GDP
// 外貿 = (Exports + Imports) / GDP
// 順差 = Goods + Services trade balance (USD billion)
const yearly = [
  { year: "2010", CN: 49.3, IN: 68.6, US: 82.9, CN_t: 50.0, IN_t: 49.3, US_t: 28.1, CN_s: 183, IN_s: -122, US_s: -495 },
  { year: "2012", CN: 51.0, IN: 69.1, US: 82.0, CN_t: 47.0, IN_t: 55.6, US_t: 30.2, CN_s: 232, IN_s: -178, US_s: -540 },
  { year: "2014", CN: 51.4, IN: 68.4, US: 81.7, CN_t: 41.5, IN_t: 49.0, US_t: 30.0, CN_s: 221, IN_s: -138, US_s: -490 },
  { year: "2016", CN: 53.6, IN: 70.9, US: 81.6, CN_t: 36.9, IN_t: 41.2, US_t: 27.0, CN_s: 255, IN_s: -105, US_s: -505 },
  { year: "2018", CN: 55.3, IN: 71.6, US: 81.4, CN_t: 38.2, IN_t: 43.6, US_t: 27.6, CN_s: 352, IN_s: -180, US_s: -628 },
  { year: "2020", CN: 54.3, IN: 73.4, US: 82.3, CN_t: 34.4, IN_t: 37.8, US_t: 23.4, CN_s: 515, IN_s: -102, US_s: -678 },
  { year: "2022", CN: 53.2, IN: 70.2, US: 81.1, CN_t: 38.2, IN_t: 49.8, US_t: 27.2, CN_s: 877, IN_s: -265, US_s: -948 },
  { year: "2024", CN: 53.5, IN: 70.8, US: 82.0, CN_t: 37.0, IN_t: 45.9, US_t: 25.4, CN_s: 992, IN_s: -78, US_s: -918 },
  { year: "2025", CN: 54.1, IN: 71.0, US: 82.3, CN_t: 37.5, IN_t: 46.5, US_t: 25.6, CN_s: 1050, IN_s: -90, US_s: -950 },
];

const colors = { CN: "#ff453a", IN: "#ffd60a", US: "#0a84ff" };
const flags = { CN: "🇨🇳", IN: "🇮🇳", US: "🇺🇸" };
const names = { CN: "中國", IN: "印度", US: "美國" };

type TabId = "consumption" | "trade" | "surplus";

const tabs: {
  id: TabId;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  unit: string;
  axisDomain: [number, number];
  fmt: (n: number) => string;
  keys: { CN: keyof typeof yearly[0]; IN: keyof typeof yearly[0]; US: keyof typeof yearly[0] };
  insight: (latest: typeof yearly[number]) => React.ReactNode;
  chartType: "line" | "bar";
}[] = [
  {
    id: "consumption",
    label: "內需 / GDP",
    icon: TrendingUp,
    unit: "%",
    axisDomain: [45, 90],
    fmt: (n) => `${n.toFixed(1)}%`,
    keys: { CN: "CN", IN: "IN", US: "US" },
    chartType: "line",
    insight: (l) => (
      <>
        <span className="text-white/85 font-medium">
          中國距美式自給結構還差 {(l.US - l.CN).toFixed(1)} 個百分點。
        </span>{" "}
        當中國內需佔比上升、向印度（~71%）甚至美國（~82%）靠攏，
        意味經濟對外貿依賴下降，
        <span className="text-red-300">
          承受脫鉤與制裁能力提升 — 動武門檻反而下降
        </span>
        。
      </>
    ),
  },
  {
    id: "trade",
    label: "外貿 / GDP",
    icon: BarChart3,
    unit: "%",
    axisDomain: [15, 60],
    fmt: (n) => `${n.toFixed(1)}%`,
    keys: { CN: "CN_t", IN: "IN_t", US: "US_t" },
    chartType: "line",
    insight: (l) => (
      <>
        <span className="text-white/85 font-medium">
          中國外貿依存度從 2010 年 50% 降至 {l.CN_t.toFixed(0)}%，
          但仍比美國（{l.US_t.toFixed(0)}%）高 {(l.CN_t - l.US_t).toFixed(0)} pp。
        </span>{" "}
        外貿佔比越低，封鎖海運的代價就越小 — 這是
        <span className="text-red-300">
          中國持續推動「雙循環」與內需擴張的核心動機
        </span>
        。
      </>
    ),
  },
  {
    id: "surplus",
    label: "貿易順差",
    icon: Coins,
    unit: "B USD",
    axisDomain: [-1100, 1200],
    fmt: (n) => `${n >= 0 ? "+" : ""}$${Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(2)}T` : `${n.toFixed(0)}B`}`,
    keys: { CN: "CN_s", IN: "IN_s", US: "US_s" },
    chartType: "bar",
    insight: (l) => (
      <>
        <span className="text-white/85 font-medium">
          中國 2025 年順差近 ${(l.CN_s as number / 1000).toFixed(2)}T USD，是 2010 年的{" "}
          {((l.CN_s as number) / 183).toFixed(1)} 倍。
        </span>{" "}
        巨額順差代表
        <span className="text-red-300">
          全球嚴重依賴中國製造 — 既是議價籌碼，也是制裁的明確擒拿點
        </span>
        。美國則持續是最大逆差國（${Math.abs(l.US_s as number)}B），脫鉤成本對雙方都極高。
      </>
    ),
  },
];

export default function EconomicCard() {
  const [tab, setTab] = useState<TabId>("consumption");
  const active = tabs.find((t) => t.id === tab)!;
  const latest = yearly[yearly.length - 1];
  const first = yearly[0];

  return (
    <Card
      id="economic"
      eyebrow="Strategic Economy"
      title="經濟韌性 · 中美印對照"
      subtitle="內需、外貿、順差 — 經濟越能自給，動武的外部成本越低"
      className="lg:col-span-2"
      badge={
        <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-white/70">
          <active.icon className="h-3 w-3" strokeWidth={2} />
          {active.label}
        </div>
      }
    >
      {/* Tab switcher */}
      <div className="relative mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.03] p-1">
        {tabs.map((t) => {
          const isActive = t.id === tab;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative z-10 flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12.5px] font-medium transition ${
                isActive ? "text-white" : "text-white/55 hover:text-white/80"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="econ-tab-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 -z-10 rounded-full bg-white/10"
                />
              )}
              <t.icon className="h-3.5 w-3.5" strokeWidth={2} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* KPI row */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`kpi-${tab}`}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-3 gap-3"
        >
          {(["CN", "IN", "US"] as const).map((c) => {
            const key = active.keys[c];
            const val = latest[key] as number;
            const delta = (latest[key] as number) - (first[key] as number);
            return (
              <KPI
                key={c}
                flag={flags[c]}
                name={names[c]}
                value={active.fmt(val)}
                delta={
                  active.id === "surplus"
                    ? `${delta >= 0 ? "+" : ""}$${Math.abs(delta) >= 1000 ? `${(delta / 1000).toFixed(1)}T` : `${delta.toFixed(0)}B`} / 15y`
                    : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)} pp / 15y`
                }
                color={
                  c === "CN"
                    ? "text-red-400"
                    : c === "IN"
                      ? "text-amber-300"
                      : "text-sky-400"
                }
                highlight={c === "CN"}
              />
            );
          })}
        </motion.div>
      </AnimatePresence>

      {/* Chart */}
      <div className="mt-6 h-[240px] w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={`chart-${tab}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
            className="h-full w-full"
          >
            <ResponsiveContainer width="100%" height="100%">
              {active.chartType === "line" ? (
                <LineChart
                  data={yearly}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={active.axisDomain}
                    tickFormatter={(v) => active.fmt(Number(v))}
                    width={60}
                  />
                  <Tooltip
                    cursor={{ stroke: "rgba(255,255,255,0.15)" }}
                    contentStyle={{
                      background: "rgba(20,20,22,0.92)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      color: "#fff",
                      fontSize: 12,
                    }}
                    formatter={(v, name) => [
                      active.fmt(Number(v)),
                      tooltipName(name as string),
                    ]}
                  />
                  <Legend
                    iconType="plainline"
                    wrapperStyle={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.6)",
                      paddingTop: 8,
                    }}
                    formatter={(v) => tooltipName(v as string)}
                  />
                  <Line
                    type="monotone"
                    dataKey={active.keys.CN}
                    stroke={colors.CN}
                    strokeWidth={2.6}
                    dot={{ r: 2.5, fill: colors.CN, stroke: colors.CN }}
                    activeDot={{ r: 5, fill: "#fff", stroke: colors.CN }}
                  />
                  <Line
                    type="monotone"
                    dataKey={active.keys.IN}
                    stroke={colors.IN}
                    strokeWidth={1.6}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4, fill: "#fff", stroke: colors.IN }}
                  />
                  <Line
                    type="monotone"
                    dataKey={active.keys.US}
                    stroke={colors.US}
                    strokeWidth={1.6}
                    strokeDasharray="4 4"
                    dot={false}
                    activeDot={{ r: 4, fill: "#fff", stroke: colors.US }}
                  />
                </LineChart>
              ) : (
                <BarChart
                  data={yearly}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                >
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    domain={active.axisDomain}
                    tickFormatter={(v) =>
                      Math.abs(Number(v)) >= 1000
                        ? `${(Number(v) / 1000).toFixed(1)}T`
                        : `${Number(v)}B`
                    }
                    width={60}
                  />
                  <ReferenceLine y={0} stroke="rgba(255,255,255,0.18)" />
                  <Tooltip
                    cursor={{ fill: "rgba(255,255,255,0.04)" }}
                    contentStyle={{
                      background: "rgba(20,20,22,0.92)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: 12,
                      color: "#fff",
                      fontSize: 12,
                    }}
                    formatter={(v, name) => [
                      active.fmt(Number(v)),
                      tooltipName(name as string),
                    ]}
                  />
                  <Legend
                    iconType="square"
                    wrapperStyle={{
                      fontSize: 11,
                      color: "rgba(255,255,255,0.6)",
                      paddingTop: 8,
                    }}
                    formatter={(v) => tooltipName(v as string)}
                  />
                  <Bar dataKey={active.keys.CN} fill={colors.CN} radius={[4, 4, 0, 0]} />
                  <Bar dataKey={active.keys.IN} fill={colors.IN} radius={[4, 4, 0, 0]} />
                  <Bar dataKey={active.keys.US} fill={colors.US} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Insight */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`insight-${tab}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.3 }}
          className="mt-5 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-[12.5px] leading-relaxed text-white/55"
        >
          {active.insight(latest)}
        </motion.div>
      </AnimatePresence>

      <p className="mt-3 text-[11.5px] text-white/35">
        資料來源：World Bank · IMF · UN Comtrade（年度，2025 為估值）。
      </p>
    </Card>
  );
}

function tooltipName(key: string): string {
  if (key.startsWith("CN")) return names.CN;
  if (key.startsWith("IN")) return names.IN;
  if (key.startsWith("US")) return names.US;
  return key;
}

function KPI({
  flag,
  name,
  value,
  delta,
  color,
  highlight = false,
}: {
  flag: string;
  name: string;
  value: string;
  delta: string;
  color: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-3.5 ${
        highlight
          ? "border-red-500/30 bg-red-500/[0.06]"
          : "border-white/8 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.16em] text-white/45">
        <span className="text-[14px] leading-none">{flag}</span>
        <span>{name}</span>
      </div>
      <div className="mt-1.5">
        <span
          className={`text-[26px] font-semibold tracking-[-0.02em] ${color}`}
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </span>
      </div>
      <div className="mt-0.5 text-[11px] text-white/45">{delta}</div>
    </div>
  );
}

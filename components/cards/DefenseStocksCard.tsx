"use client";

import { motion } from "framer-motion";
import {
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
import { ArrowDown, ArrowUp, TrendingUp, Activity, AlertTriangle } from "lucide-react";
import Card from "@/components/Card";
import { scoreColor } from "@/lib/cn_defense";
import type { CnDefenseSnapshot, Ticker } from "@/lib/cn_defense";

type Props = { snapshot: CnDefenseSnapshot };

const SERIES_COLORS = ["#ff453a", "#ffd60a"];

export default function DefenseStocksCard({ snapshot }: Props) {
  if (snapshot.source === "fallback" || snapshot.etfs.length === 0) {
    return (
      <Card
        id="defense-stocks"
        eyebrow="A-Share Defense"
        title="中國軍工股動態"
        subtitle="資料載入失敗"
        className="lg:col-span-2"
      >
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center text-[13px] text-white/45">
          無法取得即時行情，請稍後重試。
        </div>
      </Card>
    );
  }

  const stale = snapshot.staleness > 3;
  const hasFlow = snapshot.stocks.some((s) => s.mainNetLast !== 0);

  return (
    <Card
      id="defense-stocks"
      eyebrow="A-Share Defense"
      title="中國軍工股動態"
      subtitle="主要軍工龍頭 + 軍工 ETF · 趨勢與主力資金面評估"
      className="lg:col-span-2"
      badge={
        <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-white/70">
          <Activity className="h-3 w-3" strokeWidth={2} />
          紅漲綠跌 · 截至 {snapshot.asOf ?? "—"}
        </div>
      }
    >
      {stale && (
        <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/[0.08] px-3.5 py-2.5 text-[12px] leading-relaxed text-amber-200">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={2} />
          <span>
            行情資料已過期 {snapshot.staleness} 天（最後更新 {snapshot.asOf ?? "—"}）—
            自動同步可能中斷，下列數值僅供參考。
          </span>
        </div>
      )}

      {/* ETF KPI strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {snapshot.etfs.map((e) => (
          <EtfCard key={e.code} t={e} />
        ))}
      </div>

      {/* Normalized line chart */}
      <div className="mt-6">
        <div className="mb-2 flex items-baseline justify-between">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">
            60-Day Normalized Performance · 基期 = 100
          </div>
          <div className="flex items-center gap-3 text-[11px] text-white/40">
            {snapshot.seriesKeys.map((k, i) => (
              <span key={k.code} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-0.5 w-3"
                  style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
                />
                {k.name}
              </span>
            ))}
          </div>
        </div>
        <div className="h-[240px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={snapshot.series}
              margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
            >
              <defs>
                {snapshot.seriesKeys.map((k, i) => (
                  <linearGradient
                    key={k.code}
                    id={`def-${k.code}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor={SERIES_COLORS[i % SERIES_COLORS.length]}
                      stopOpacity={0.5}
                    />
                    <stop
                      offset="100%"
                      stopColor={SERIES_COLORS[i % SERIES_COLORS.length]}
                      stopOpacity={0}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(d) => String(d).slice(5)}
                minTickGap={32}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.45)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={["dataMin - 2", "dataMax + 2"]}
                width={36}
                tickFormatter={(v) => Number(v).toFixed(0)}
              />
              <ReferenceLine
                y={100}
                stroke="rgba(255,255,255,0.18)"
                strokeDasharray="3 3"
              />
              <Tooltip
                cursor={{ stroke: "rgba(255,255,255,0.18)" }}
                contentStyle={{
                  background: "rgba(20,20,22,0.95)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 12,
                  color: "#fff",
                  fontSize: 11,
                }}
                formatter={(v, name) => {
                  const k = snapshot.seriesKeys.find((x) => x.code === name);
                  return [Number(v).toFixed(2), k?.name ?? name];
                }}
                labelFormatter={(d) => String(d)}
              />
              {snapshot.seriesKeys.map((k, i) => (
                <Line
                  key={k.code}
                  type="monotone"
                  dataKey={k.code}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={i === 0 ? 2.4 : 1.8}
                  dot={false}
                  activeDot={{ r: 4, fill: "#fff", stroke: SERIES_COLORS[i] }}
                />
              ))}
              <Legend
                wrapperStyle={{ display: "none" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stocks leaderboard */}
      <div className="mt-7">
        <div className="mb-3 flex items-baseline justify-between">
          <div className="text-[11px] uppercase tracking-[0.2em] text-white/45">
            軍工龍頭 · 主力評分排序
          </div>
          <div className="text-[11px] text-white/40">
            <TrendingUp className="mr-1 inline h-3 w-3" />
            5d / 20d 漲幅 · 量比 · 主力資金 · 評分
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/8 bg-white/[0.02]">
          <table className={`w-full ${hasFlow ? "min-w-[820px]" : "min-w-[720px]"} text-[12.5px]`}>
            <thead>
              <tr className="border-b border-white/10 text-[10.5px] uppercase tracking-[0.14em] text-white/45">
                <th className="py-2.5 pl-4 text-left font-medium">個股 / 業務</th>
                <th className="py-2.5 px-3 text-right font-medium">收盤</th>
                <th className="py-2.5 px-3 text-right font-medium">日漲</th>
                <th className="py-2.5 px-3 text-right font-medium">5日</th>
                <th className="py-2.5 px-3 text-right font-medium">20日</th>
                <th className="py-2.5 px-3 text-right font-medium">量比</th>
                {hasFlow && (
                  <th className="py-2.5 px-3 text-right font-medium">主力5日</th>
                )}
                <th className="py-2.5 pl-3 pr-4 text-left font-medium">主力評分</th>
              </tr>
            </thead>
            <tbody>
              {snapshot.stocks.map((s, i) => (
                <StockRow key={s.code} t={s} index={i} hasFlow={hasFlow} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insight box */}
      <SummaryInsight stocks={snapshot.stocks} />

      <p className="mt-4 text-[11px] text-white/35">
        資料來源：騰訊財經（日 K · 前復權）+ 東方財富（主力資金淨流入）。主力評分為
        主力 5 日淨流入 / 主力淨占比 / 5 日漲幅 / 連漲 / 20MA / MACD / 突破合成；
        每交易日收盤後自動同步，僅供研究參考，非投資建議。
      </p>
    </Card>
  );
}

function EtfCard({ t }: { t: Ticker }) {
  const up = t.dayChange >= 0;
  const upColor = up ? "text-red-400" : "text-emerald-400";
  return (
    <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-semibold tracking-tight text-white">
              {t.name}
            </span>
            <span className="text-[10.5px] text-white/40">{t.code}</span>
          </div>
          <div className="text-[11px] text-white/45">{t.sector}</div>
        </div>
        <div
          className={`flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-1 text-[11px] ${upColor}`}
        >
          {up ? (
            <ArrowUp className="h-3 w-3" strokeWidth={2.4} />
          ) : (
            <ArrowDown className="h-3 w-3" strokeWidth={2.4} />
          )}
          {t.dayChange.toFixed(2)}%
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <span
          className="text-[40px] font-semibold leading-none tracking-[-0.02em] text-white"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {t.last?.close.toFixed(3)}
        </span>
        <span className="text-[13px] text-white/40">CNY</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
        <Mini label="5日" value={t.ret5} />
        <Mini label="20日" value={t.ret20} />
        <Mini label="量比" raw={t.volRatio.toFixed(2)} />
      </div>
    </div>
  );
}

function Mini({
  label,
  value,
  raw,
}: {
  label: string;
  value?: number;
  raw?: string;
}) {
  const isNum = typeof value === "number";
  const up = isNum && value! >= 0;
  const color = !isNum
    ? "text-white/85"
    : up
      ? "text-red-300"
      : "text-emerald-300";
  return (
    <div className="rounded-lg border border-white/8 bg-white/[0.02] px-2.5 py-1.5">
      <div className="text-[9.5px] uppercase tracking-[0.16em] text-white/35">
        {label}
      </div>
      <div
        className={`mt-0.5 text-[12.5px] font-medium ${color}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {isNum
          ? `${up ? "+" : ""}${value!.toFixed(2)}%`
          : raw}
      </div>
    </div>
  );
}

function StockRow({
  t,
  index,
  hasFlow,
}: {
  t: Ticker;
  index: number;
  hasFlow: boolean;
}) {
  const sc = scoreColor(t.score);
  const dayUp = t.dayChange >= 0;
  const r5Up = t.ret5 >= 0;
  const r20Up = t.ret20 >= 0;
  const volHot = t.volRatio >= 1.5;
  const flowIn = t.mainNet5 >= 0;

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{
        duration: 0.4,
        delay: index * 0.04,
        ease: [0.22, 1, 0.36, 1],
      }}
      className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
    >
      <td className="py-2.5 pl-4">
        <div className="flex items-center gap-2">
          <span className="text-[10.5px] text-white/40">{t.code}</span>
          <span className="font-medium text-white">{t.name}</span>
        </div>
        <div className="text-[10.5px] text-white/45">{t.sector}</div>
      </td>
      <td
        className="px-3 text-right font-medium text-white"
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {t.last?.close.toFixed(2) ?? "—"}
      </td>
      <td
        className={`px-3 text-right ${dayUp ? "text-red-300" : "text-emerald-300"}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {dayUp ? "+" : ""}
        {t.dayChange.toFixed(2)}%
      </td>
      <td
        className={`px-3 text-right ${r5Up ? "text-red-300" : "text-emerald-300"}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {r5Up ? "+" : ""}
        {t.ret5.toFixed(1)}%
      </td>
      <td
        className={`px-3 text-right ${r20Up ? "text-red-300" : "text-emerald-300"}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {r20Up ? "+" : ""}
        {t.ret20.toFixed(1)}%
      </td>
      <td
        className={`px-3 text-right ${volHot ? "text-amber-300" : "text-white/65"}`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {t.volRatio.toFixed(2)}
      </td>
      {hasFlow && (
        <td
          className={`px-3 text-right ${flowIn ? "text-red-300" : "text-emerald-300"}`}
          style={{ fontVariantNumeric: "tabular-nums" }}
          title={`今日主力 ${formatYi(t.mainNetLast)} · 淨占比 ${t.mainPctLast.toFixed(1)}%`}
        >
          {formatYi(t.mainNet5)}
        </td>
      )}
      <td className="pl-3 pr-4">
        <div className="flex items-center gap-2.5">
          <div className="relative h-1.5 w-20 overflow-hidden rounded-full bg-white/8">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${t.score}%` }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                duration: 0.9,
                delay: index * 0.04 + 0.15,
                ease: [0.22, 1, 0.36, 1],
              }}
              className={`h-full ${sc.bar}`}
            />
          </div>
          <span
            className={`min-w-[28px] text-right text-[13px] font-semibold ${sc.text}`}
            style={{ fontVariantNumeric: "tabular-nums" }}
          >
            {t.score}
          </span>
          <span className={`text-[10.5px] ${sc.text}`}>{sc.label}</span>
        </div>
      </td>
    </motion.tr>
  );
}

function SummaryInsight({ stocks }: { stocks: Ticker[] }) {
  const hot = stocks.filter((s) => s.score >= 50);
  const breakingHigh = stocks.filter((s) => s.breakdown["突破20日高"] > 0);
  const hasFlow = stocks.some((s) => s.mainNetLast !== 0);
  const inflowing = stocks.filter((s) => s.mainNet5 > 0);
  const netSum5 = stocks.reduce((s, x) => s + x.mainNet5, 0);
  const avgRet5 =
    stocks.reduce((s, x) => s + x.ret5, 0) / Math.max(1, stocks.length);
  const tone =
    hot.length >= 4
      ? "板塊主力進場跡象明顯"
      : hot.length >= 2
        ? "局部熱度，未見全面拉抬"
        : "整體盤整，未見資金集中";

  return (
    <div className="mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-4 text-[12.5px] leading-relaxed text-white/55">
      <span className="font-medium text-white/85">
        {tone} · 5 日板塊均漲 {avgRet5.toFixed(2)}%
      </span>
      。{hot.length} / {stocks.length} 檔評分 ≥ 50；{breakingHigh.length} 檔突破 20 日高。
      {hasFlow && (
        <>
          {" "}
          近 5 日主力資金合計
          <span className={netSum5 >= 0 ? "text-red-300" : "text-emerald-300"}>
            {netSum5 >= 0 ? "淨流入 " : "淨流出 "}
            {formatYi(Math.abs(netSum5))}
          </span>
          ，{inflowing.length} / {stocks.length} 檔主力淨流入。
        </>
      )}
      {hot.length >= 2 && (
        <>
          {" "}
          領漲：
          <span className="text-red-300">
            {hot
              .slice(0, 3)
              .map((s) => s.name)
              .join("、")}
          </span>
          。
        </>
      )}{" "}
      A 股軍工板塊的主力資金動向，常為地緣風險定價的領先指標 —
      <span className="text-white/80">
        當民用消費走弱、軍工資金持續流入，反映政策面預期升溫
      </span>
      。
    </div>
  );
}

// 主力淨流入：元 → 億元，帶正負號。
function formatYi(net: number): string {
  if (!net) return "—";
  const yi = net / 1e8;
  const sign = yi > 0 ? "+" : yi < 0 ? "−" : "";
  return `${sign}${Math.abs(yi).toFixed(2)} 億`;
}

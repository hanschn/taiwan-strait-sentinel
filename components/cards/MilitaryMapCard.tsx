"use client";

import dynamic from "next/dynamic";
import { Crosshair } from "lucide-react";
import Card from "@/components/Card";

const MilitaryMap = dynamic(() => import("@/components/MilitaryMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[440px] w-full items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] text-[13px] text-white/40">
      載入戰略地圖中…
    </div>
  ),
});

export default function MilitaryMapCard() {
  return (
    <Card
      id="map"
      eyebrow="Force Deployment"
      title="解放軍兵力部署實況"
      subtitle="台海周邊主要基地、近期擾台軌跡 (OSINT 整理)"
      badge={
        <div className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-amber-300">
          <Crosshair className="h-3 w-3" strokeWidth={2} />
          OSINT · 30d
        </div>
      }
    >
      <MilitaryMap />

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Legend color="#ff453a" label="火箭軍 / 前進部署" />
        <Legend color="#ff6b35" label="空軍基地" />
        <Legend color="#0a84ff" label="海軍基地 / 台灣" />
        <Legend color="#ffd60a" label="戰區聯指" />
      </div>

      <p className="mt-4 text-[11.5px] leading-relaxed text-white/40">
        資料來源：CSIS · Janes · 國防部即時軍事動態 · OSINT 開源情報。
        座標為公開資料整理，精度約 ±10 km；不代表完整部署狀態。
      </p>
    </Card>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.02] px-3 py-1.5 text-[11px] text-white/65">
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: color, boxShadow: `0 0 8px ${color}` }}
      />
      {label}
    </div>
  );
}

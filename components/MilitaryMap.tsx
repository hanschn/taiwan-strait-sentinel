"use client";

import {
  CircleMarker,
  MapContainer,
  Polygon,
  TileLayer,
  Tooltip,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Public knowledge — CSIS, Janes, MND OSINT compilations.
// Coordinates approximate to ±10 km.
const PLA_BASES: Array<{
  name: string;
  lat: number;
  lng: number;
  units: string;
  type: "command" | "rocket" | "air" | "naval" | "forward";
}> = [
  {
    name: "東部戰區聯指 · 南京",
    lat: 32.06,
    lng: 118.78,
    units: "東部戰區指揮所",
    type: "command",
  },
  {
    name: "61 基地 · 黃山",
    lat: 30.13,
    lng: 118.16,
    units: "火箭軍 · 短程彈道飛彈旅",
    type: "rocket",
  },
  {
    name: "福州空軍基地",
    lat: 26.07,
    lng: 119.3,
    units: "Su-30 / J-11 戰機聯隊",
    type: "air",
  },
  {
    name: "廈門基地",
    lat: 24.48,
    lng: 118.09,
    units: "東海艦隊登陸艦群",
    type: "naval",
  },
  {
    name: "汕頭基地",
    lat: 23.35,
    lng: 116.68,
    units: "海軍航空兵 · J-10",
    type: "air",
  },
  {
    name: "寧德海軍基地",
    lat: 26.66,
    lng: 119.55,
    units: "075 型兩棲攻擊艦",
    type: "naval",
  },
  {
    name: "平潭島 (距台 130 km)",
    lat: 25.5,
    lng: 119.79,
    units: "陸戰 73 集團軍前進部署",
    type: "forward",
  },
  {
    name: "舟山海軍基地",
    lat: 30.0,
    lng: 122.1,
    units: "東海艦隊驅逐艦支隊",
    type: "naval",
  },
];

const TAIWAN_NODES = [
  { name: "🇹🇼 台北", lat: 25.04, lng: 121.56 },
  { name: "🇹🇼 高雄", lat: 22.63, lng: 120.3 },
  { name: "🇹🇼 花蓮", lat: 23.97, lng: 121.6 },
];

// Recent ADIZ incursion clusters — Sep–Nov 2025 MND-style data
const RECENT_INCURSIONS: Array<[number, number]> = [
  [22.0, 119.5],
  [22.5, 119.0],
  [22.0, 118.5],
  [21.5, 119.5],
  [21.8, 120.0],
  [22.3, 119.8],
  [26.0, 121.0],
  [25.8, 122.5],
  [26.2, 121.8],
  [23.5, 122.5],
  [24.5, 122.8],
  [24.0, 122.9],
];

// Southwest ADIZ — most active corner
const SW_ADIZ: Array<[number, number]> = [
  [22.5, 117.8],
  [23.0, 119.8],
  [21.5, 121.0],
  [21.0, 119.5],
];

// Eastern theater operating zone (post-2022 trend)
const EAST_ZONE: Array<[number, number]> = [
  [23.0, 122.2],
  [25.0, 122.5],
  [25.0, 123.5],
  [23.0, 123.5],
];

const TYPE_COLOR: Record<string, string> = {
  command: "#ffd60a",
  rocket: "#ff453a",
  air: "#ff6b35",
  naval: "#0a84ff",
  forward: "#ff453a",
};

export default function MilitaryMap() {
  return (
    <div className="relative h-[440px] w-full overflow-hidden rounded-2xl border border-white/10">
      <MapContainer
        center={[25.0, 120.5]}
        zoom={6}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "#000" }}
        className="z-0"
        attributionControl
      >
        <TileLayer
          attribution='&copy; <a href="https://carto.com/" target="_blank" rel="noreferrer">Carto</a> · &copy; OpenStreetMap'
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          subdomains="abcd"
          maxZoom={19}
        />

        {/* SW ADIZ active zone */}
        <Polygon
          positions={SW_ADIZ}
          pathOptions={{
            color: "#ff453a",
            weight: 1,
            dashArray: "5, 6",
            fillColor: "#ff453a",
            fillOpacity: 0.1,
          }}
        >
          <Tooltip sticky>西南 ADIZ · 解放軍主要擾台空域</Tooltip>
        </Polygon>

        {/* Eastern operating zone (Liaoning carrier rotation area) */}
        <Polygon
          positions={EAST_ZONE}
          pathOptions={{
            color: "#ff6b35",
            weight: 1,
            dashArray: "5, 6",
            fillColor: "#ff6b35",
            fillOpacity: 0.06,
          }}
        >
          <Tooltip sticky>東部太平洋訓練區 · 航艦戰鬥群</Tooltip>
        </Polygon>

        {/* Recent incursions */}
        {RECENT_INCURSIONS.map((p, i) => (
          <CircleMarker
            key={`inc-${i}`}
            center={p}
            radius={3.5}
            pathOptions={{
              color: "#ff453a",
              fillColor: "#ff453a",
              fillOpacity: 0.7,
              weight: 1,
            }}
          >
            <Tooltip>近 30 日軍機 / 艦艇進入位置</Tooltip>
          </CircleMarker>
        ))}

        {/* PLA bases */}
        {PLA_BASES.map((b) => (
          <CircleMarker
            key={b.name}
            center={[b.lat, b.lng]}
            radius={7}
            pathOptions={{
              color: TYPE_COLOR[b.type],
              fillColor: TYPE_COLOR[b.type],
              fillOpacity: 0.85,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              <div>
                <div className="font-semibold" style={{ color: "#fff" }}>
                  {b.name}
                </div>
                <div style={{ color: "rgba(255,255,255,0.7)" }}>{b.units}</div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Taiwan nodes */}
        {TAIWAN_NODES.map((t) => (
          <CircleMarker
            key={t.name}
            center={[t.lat, t.lng]}
            radius={6}
            pathOptions={{
              color: "#ffffff",
              fillColor: "#0a84ff",
              fillOpacity: 0.95,
              weight: 2,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]} permanent>
              <span style={{ fontSize: 11, fontWeight: 600 }}>{t.name}</span>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

import { getPolymarketSnapshot } from "@/lib/polymarket";
import { getMndSnapshot } from "@/lib/mnd";
import { getLegislatorSnapshot } from "@/lib/legislators";
import { getCnDefenseSnapshot } from "@/lib/cn_defense";
import StarfieldBackground from "@/components/StarfieldBackground";
import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import SectionHeader from "@/components/SectionHeader";
import EconomicCard from "@/components/cards/EconomicCard";
import LegislatorCard from "@/components/cards/LegislatorCard";
import MilitaryCard from "@/components/cards/MilitaryCard";
import MilitaryMapCard from "@/components/cards/MilitaryMapCard";
import MarketCard from "@/components/cards/MarketCard";
import DefenseStocksCard from "@/components/cards/DefenseStocksCard";
import Footer from "@/components/Footer";

export const revalidate = 60;

export default async function Home() {
  const [snapshot, mnd] = await Promise.all([
    getPolymarketSnapshot(),
    getMndSnapshot(),
  ]);
  const legislators = getLegislatorSnapshot();
  const cnDefense = getCnDefenseSnapshot();

  return (
    <main className="relative">
      <StarfieldBackground />
      <Nav />
      <Hero snapshot={snapshot} />

      <section className="px-6 py-32 sm:py-40">
        <SectionHeader
          eyebrow="Six Vital Signs"
          title="六個關鍵指標，追蹤海峽兩岸風險脈動"
          description="從預測市場、立法院動態、解放軍部署、A 股軍工資金面到中國經濟結構 — 各自獨立、互相印證。"
        />

        <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
          <MarketCard snapshot={snapshot} />
          <MilitaryCard mnd={mnd} />
          <LegislatorCard snapshot={legislators} />
          <MilitaryMapCard />
          <DefenseStocksCard snapshot={cnDefense} />
          <EconomicCard />
        </div>
      </section>

      <Footer />
    </main>
  );
}

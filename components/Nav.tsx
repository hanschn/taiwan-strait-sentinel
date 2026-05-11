"use client";

import { motion } from "framer-motion";
import { Radar } from "lucide-react";

export default function Nav() {
  return (
    <motion.header
      initial={{ y: -16, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-0 left-0 right-0 z-50"
    >
      <div className="mx-auto max-w-7xl px-6 pt-4">
        <div className="glass flex items-center justify-between rounded-2xl px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Radar className="h-5 w-5 text-red-400" strokeWidth={1.6} />
            <span className="text-[15px] font-semibold tracking-tight">
              Taiwan Strait Sentinel
            </span>
            <span className="hidden text-[12px] text-white/40 sm:inline">
              · 台海哨兵
            </span>
          </div>
          <nav className="hidden items-center gap-5 text-[13px] text-white/70 md:flex">
            <a className="transition hover:text-white" href="#market">
              市場
            </a>
            <a className="transition hover:text-white" href="#military">
              軍事
            </a>
            <a className="transition hover:text-white" href="#legislative">
              立委
            </a>
            <a className="transition hover:text-white" href="#map">
              部署
            </a>
            <a className="transition hover:text-white" href="#defense-stocks">
              軍工股
            </a>
            <a className="transition hover:text-white" href="#economic">
              經濟
            </a>
          </nav>
        </div>
      </div>
    </motion.header>
  );
}

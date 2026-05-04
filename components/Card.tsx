"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type Props = {
  id?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
  delay?: number;
  className?: string;
};

export default function Card({
  id,
  eyebrow,
  title,
  subtitle,
  badge,
  children,
  delay = 0,
  className = "",
}: Props) {
  return (
    <motion.section
      id={id}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay }}
      className={`glass relative flex flex-col overflow-hidden rounded-3xl p-7 sm:p-9 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.28em] text-white/45">
            {eyebrow}
          </div>
          <h3 className="mt-2 text-[24px] font-semibold tracking-[-0.01em] sm:text-[28px]">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-1.5 text-[14px] text-white/55">{subtitle}</p>
          )}
        </div>
        {badge}
      </div>

      <div className="mt-6 flex-1">{children}</div>
    </motion.section>
  );
}

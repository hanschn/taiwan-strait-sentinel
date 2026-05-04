"use client";

import { motion } from "framer-motion";

type Props = {
  eyebrow: string;
  title: string;
  description?: string;
};

export default function SectionHeader({ eyebrow, title, description }: Props) {
  return (
    <div className="mx-auto mb-12 max-w-3xl text-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-[11px] uppercase tracking-[0.28em] text-white/45"
      >
        {eyebrow}
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 14 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
        className="text-balance mt-3 text-[34px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[44px]"
      >
        {title}
      </motion.h2>
      {description && (
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
          className="text-balance mt-4 text-[16px] leading-relaxed text-white/55"
        >
          {description}
        </motion.p>
      )}
    </div>
  );
}

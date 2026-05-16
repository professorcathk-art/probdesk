"use client";

import { motion } from "framer-motion";

export function GalaxyBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(56,189,248,0.16),transparent_55%),radial-gradient(ellipse_at_bottom,rgba(99,102,241,0.12),transparent_50%),linear-gradient(to_bottom,rgb(2,6,23),rgb(0,0,0))]" />
      <motion.div
        className="absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, rgba(255,255,255,0.16) 0, transparent 2px), radial-gradient(circle at 80% 12%, rgba(255,255,255,0.12) 0, transparent 2px), radial-gradient(circle at 40% 78%, rgba(255,255,255,0.1) 0, transparent 2px)",
          backgroundSize: "520px 520px, 680px 680px, 720px 720px",
        }}
        animate={{ backgroundPosition: ["0px 0px", "120px 80px"] }}
        transition={{ duration: 46, repeat: Infinity, repeatType: "mirror", ease: "linear" }}
      />
      <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.2),rgba(0,0,0,0.65))]" />
    </div>
  );
}
